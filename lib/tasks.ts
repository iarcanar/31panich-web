import { readJSON, writeJSON, withLock } from "./blob-store"
import { isOverdue } from "@/components/admin/tasks/status"
import { MAX_ITEMS_PER_TASK, MAX_ATTACHMENTS_PER_ITEM } from "@/types/task"
import type { Task, TaskComment, TaskInput, TaskItem } from "@/types/task"

const FILE = "tasks.json"

async function readAll(): Promise<Task[]> {
  return await readJSON<Task[]>(FILE, [])
}

async function writeAll(tasks: Task[]): Promise<void> {
  await writeJSON(FILE, tasks)
}

/** ตัด items เกิน MAX_ITEMS_PER_TASK, attachments เกิน MAX_ATTACHMENTS_PER_ITEM ทิ้งท้าย (ไม่ throw)
 *  + gen id ให้ item ที่ยังไม่มี */
function sanitizeItems(items: TaskItem[]): TaskItem[] {
  return items.slice(0, MAX_ITEMS_PER_TASK).map((item) => ({
    id: item.id || crypto.randomUUID(),
    title: item.title ?? "",
    detail: item.detail ?? "",
    products: item.products ?? [],
    attachments: (item.attachments ?? []).slice(0, MAX_ATTACHMENTS_PER_ITEM),
  }))
}

/** TSK-004 — เลขต่อจากเลข TSK สูงสุดที่มีอยู่ + 1 (ห้ามใช้ length+1 เพราะลบใบงานแล้วเลขซ้ำ) */
function nextCode(all: Task[]): string {
  let max = 0
  for (const t of all) {
    const m = /^TSK-(\d+)$/.exec(t.code)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > max) max = n
    }
  }
  return `TSK-${String(max + 1).padStart(3, "0")}`
}

export async function getTasks(): Promise<Task[]> {
  const all = await readAll()
  const notDone = all.filter((t) => t.status !== "done")
  const done = all.filter((t) => t.status === "done")

  // ในกลุ่มที่ยังไม่เสร็จ: urgent หรือเลยกำหนดส่งขึ้นก่อน แล้วเรียง updatedAt ใหม่→เก่า
  const rank = (t: Task) => (t.priority === "urgent" || isOverdue(t.dueDate, t.status) ? 0 : 1)
  notDone.sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  done.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return [...notDone, ...done]
}

export async function getTaskById(id: string): Promise<Task | null> {
  const all = await readAll()
  return all.find((t) => t.id === id) ?? null
}

export async function createTask(
  input: TaskInput,
  createdBy: { id: string; name: string }
): Promise<Task> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const now = new Date().toISOString()
    const task: Task = {
      id: crypto.randomUUID(),
      code: nextCode(all),
      title: input.title,
      type: input.type,
      status: "requested",
      priority: input.priority,
      dueDate: input.dueDate,
      description: input.description,
      items: sanitizeItems(input.items ?? []),
      comments: [],
      createdBy,
      createdAt: now,
      updatedAt: now,
    }
    all.push(task)
    await writeAll(all)
    return task
  })
}

// field ที่ต้อง ignore เสมอตอน PUT — กัน client ที่เปิดฟอร์มค้างไว้เซฟทับคอมเมนต์/ข้อมูลระบบ
const FORBIDDEN_PATCH_KEYS = ["comments", "code", "createdBy", "createdAt", "id"] as const

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) return null

    const safePatch: Partial<Task> = { ...patch }
    for (const key of FORBIDDEN_PATCH_KEYS) delete safePatch[key]
    if (safePatch.items) safePatch.items = sanitizeItems(safePatch.items)

    const existing = all[idx]
    const next: Task = { ...existing, ...safePatch, updatedAt: new Date().toISOString() }

    // doneAt: set เมื่อเข้า done, clear เมื่อย้อนกลับออกจาก done
    if (next.status === "done" && existing.status !== "done") {
      next.doneAt = new Date().toISOString()
    } else if (next.status !== "done" && existing.status === "done") {
      next.doneAt = undefined
    }

    all[idx] = next
    await writeAll(all)
    return next
  })
}

export async function addComment(
  id: string,
  comment: { authorId: string; authorName: string; text: string }
): Promise<Task | null> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) return null

    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      authorId: comment.authorId,
      authorName: comment.authorName,
      text: comment.text,
      createdAt: new Date().toISOString(),
    }
    all[idx] = {
      ...all[idx],
      comments: [...all[idx].comments, newComment],
      updatedAt: new Date().toISOString(),
    }
    await writeAll(all)
    return all[idx]
  })
}

/** คืนใบที่ลบ (route เอา attachment ไป destroy บน Cloudinary ต่อ) */
export async function deleteTask(id: string): Promise<Task | null> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) return null
    const [removed] = all.splice(idx, 1)
    await writeAll(all)
    return removed
  })
}

/** รวม url จาก items[].attachments[] ทุกตัว — ใช้เทียบ diff ตอน PUT และ cleanup ตอน DELETE */
export function collectAttachmentUrls(task: Task): string[] {
  return task.items.flatMap((item) => item.attachments.map((a) => a.url))
}
