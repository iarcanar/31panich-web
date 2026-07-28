"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Task, TaskItem, TaskPriority, TaskType } from "@/types/task"
import { MAX_ITEMS_PER_TASK } from "@/types/task"
import { TYPE_META, TYPE_ORDER, PRIORITY_META } from "./status"
import { FieldLabel, TextInput } from "@/components/admin/ui"
import { TaskItemEditor } from "./TaskItemEditor"
import { UploadStatusContext } from "./TaskAttachmentUploader"

function makeEmptyItem(): TaskItem {
  return { id: crypto.randomUUID(), title: "", detail: "", products: [], attachments: [] }
}

const PRIORITY_ORDER: TaskPriority[] = ["normal", "urgent"]

export default function TaskEditor({
  task,
  onClose,
  onSaved,
}: {
  task: Task | null
  onClose: () => void
  onSaved: (t: Task) => void
}) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [type, setType] = useState<TaskType>(task?.type ?? "general")
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal")
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [items, setItems] = useState<TaskItem[]>(() =>
    task && task.items.length > 0 ? task.items : [makeEmptyItem()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ใบงานเก่าที่ deploy ไปแล้วอาจมี "รายละเอียดงาน" ระดับใบงานค้างอยู่ — โชว์ช่องนี้
  // ต่อไปเฉพาะตอนแก้ไขใบที่มีของเดิม (เช็คจาก task prop ตรงๆ ไม่ใช่ description state
  // เพื่อไม่ให้ช่องหายไปกลางคันถ้าผู้ใช้ลบข้อความจนว่างระหว่างแก้ไข)
  const hasLegacyDescription = Boolean(task?.description && task.description.trim() !== "")

  const taskCode = task?.code ?? "ใบงานใหม่"

  // Full body-scroll-lock recipe (mobile fixed-overlay pattern used across admin)
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Bubble "is any nested TaskAttachmentUploader mid-upload" up to disable Save,
  // without widening the locked TaskItemEditor/TaskAttachmentUploader props.
  const uploadingSetRef = useRef<Set<string>>(new Set())
  const [anyUploading, setAnyUploading] = useState(false)
  const reportUploading = useCallback((id: string, busy: boolean) => {
    const set = uploadingSetRef.current
    if (busy) set.add(id)
    else set.delete(id)
    setAnyUploading(set.size > 0)
  }, [])

  function addItem() {
    setItems((prev) => (prev.length >= MAX_ITEMS_PER_TASK ? prev : [...prev, makeEmptyItem()]))
  }

  function updateItem(idx: number, next: TaskItem) {
    setItems((prev) => prev.map((it, i) => (i === idx ? next : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("ใส่ชื่องานก่อน")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        type,
        priority,
        dueDate: dueDate || undefined,
        description,
        items: items.map((it, i) => ({
          ...it,
          title:
            it.title.trim() ||
            it.products.map((p) => p.name).join(" + ") ||
            `${TYPE_META[type].cardWord} ${i + 1}`,
        })),
      }
      const url = task ? `/api/admin/tasks/${task.id}` : "/api/admin/tasks"
      const method = task ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const saved: Task = await res.json()
      onSaved(saved)
      onClose()
    } catch {
      setError("บันทึกไม่สำเร็จ ลองอีกครั้ง")
    } finally {
      setSaving(false)
    }
  }

  // ปิดโดยไม่ตั้งใจ = บรีฟที่พิมพ์มาทั้งหน้าหายหมด — ถามก่อนถ้ากรอกอะไรไว้แล้ว
  function requestClose() {
    const dirty =
      title.trim() !== "" ||
      description.trim() !== "" ||
      items.some((it) => it.title.trim() || it.detail.trim() || it.products.length > 0 || it.attachments.length > 0)
    if (dirty && !confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกไว้จะหายไป")) return
    onClose()
  }

  const saveLabel = anyUploading
    ? "รอรูปอัปเสร็จ..."
    : saving
      ? task
        ? "กำลังบันทึก..."
        : "กำลังส่ง..."
      : task
        ? "บันทึกการแก้ไข"
        : "ส่งใบงาน"

  const atMaxItems = items.length >= MAX_ITEMS_PER_TASK

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 md:items-center md:p-4"
      onClick={requestClose}
    >
      <div
        className="bg-[#13131d] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-xl md:border md:border-white/10 overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#13131d] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {task ? `แก้ไขใบงาน ${task.code}` : "สั่งงานใหม่"}
          </h2>
          <button
            onClick={requestClose}
            className="text-[#64748b] hover:text-white text-lg leading-none cursor-pointer"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* โซน 1 — ข้อมูลงาน (accent สีฟ้า) */}
          <div className="border-l-2 border-l-sky-400/60 pl-3 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full bg-sky-500/15 text-sky-300 text-[10px] flex items-center justify-center">
                1
              </span>
              <h3 className="text-sky-300 text-xs font-semibold">ข้อมูลงาน</h3>
            </div>

            <div>
              <FieldLabel required>ชื่องาน</FieldLabel>
              <TextInput value={title} onChange={setTitle} placeholder="เช่น จัดโปรแลกแต้มเดือนนี้" />
            </div>

            <div>
              <FieldLabel>ประเภทงาน</FieldLabel>
              <div className="flex gap-2">
                {TYPE_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      type === t
                        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                        : "bg-[#1a1a28] text-[#94a3b8] border border-white/10"
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ความเร่งด่วน</FieldLabel>
                <div className="flex gap-2">
                  {PRIORITY_ORDER.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        priority === p
                          ? p === "urgent"
                            ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
                            : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                          : "bg-[#1a1a28] text-[#94a3b8] border border-white/10"
                      }`}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>ต้องการภายใน</FieldLabel>
                <TextInput type="date" value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            {hasLegacyDescription && (
              <div>
                <FieldLabel>รายละเอียดงาน (ของเดิม)</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="อธิบายงานที่ต้องการ..."
                  className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base md:text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none resize-y"
                />
              </div>
            )}
          </div>

          {/* โซน 2 — รายการ (accent สีเขียวอมฟ้า) */}
          <div className="border-l-2 border-l-teal-400/60 pl-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full bg-teal-500/15 text-teal-300 text-[10px] flex items-center justify-center">
                2
              </span>
              <h3 className="text-teal-300 text-xs font-semibold">รายการ</h3>
            </div>
            <p className="text-[11px] text-[#64748b]">{TYPE_META[type].hint}</p>

            <UploadStatusContext.Provider value={reportUploading}>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <TaskItemEditor
                    key={item.id}
                    item={item}
                    index={i}
                    type={type}
                    taskCode={taskCode}
                    taskTitle={title}
                    onChange={(next) => updateItem(i, next)}
                    onRemove={() => removeItem(i)}
                  />
                ))}
              </div>
            </UploadStatusContext.Provider>

            <button
              type="button"
              onClick={addItem}
              disabled={atMaxItems}
              className="h-11 w-full border border-dashed border-teal-500/40 rounded-lg text-teal-300 hover:bg-teal-500/10 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent whitespace-nowrap"
            >
              {atMaxItems
                ? `ครบ 10 ${TYPE_META[type].cardWord}ต่อใบแล้ว`
                : `+ เพิ่ม${TYPE_META[type].cardWord}ตัวที่ ${items.length + 1}`}
            </button>
          </div>
        </div>

        {/* pb ต้องบวกกับ padding เดิม ไม่ใช่แทนที่ — ไม่งั้นเครื่องที่ไม่มีรอยบาก (env=0)
            ปุ่มจะติดขอบล่างจอ */}
        <div className="sticky bottom-0 bg-[#13131d] border-t border-white/10 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
          <button
            onClick={requestClose}
            className="h-9 px-4 text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || anyUploading}
            className="h-9 px-5 bg-amber-600 hover:bg-amber-500 disabled:bg-[#2a2a3a] disabled:text-[#64748b] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
