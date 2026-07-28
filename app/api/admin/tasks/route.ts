import { NextRequest, NextResponse } from "next/server"
import { getTasks, createTask } from "@/lib/tasks"
import { getSessionUser } from "@/lib/auth"
import type { TaskInput, TaskItem, TaskType, TaskPriority } from "@/types/task"

const VALID_TYPES: TaskType[] = ["points_reward", "bundle_promo", "general"]
const VALID_PRIORITIES: TaskPriority[] = ["normal", "urgent"]

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const tasks = await getTasks()
    if (req.nextUrl.searchParams.get("count") === "1") {
      const open = tasks.filter((t) => t.status !== "done").length
      return NextResponse.json({ open })
    }
    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 })
    }

    const input: TaskInput = {
      title: String(body.title),
      type: VALID_TYPES.includes(body.type) ? body.type : "general",
      priority: VALID_PRIORITIES.includes(body.priority) ? body.priority : "normal",
      description: typeof body.description === "string" ? body.description : "",
      items: Array.isArray(body.items) ? (body.items as TaskItem[]) : [],
      dueDate: typeof body.dueDate === "string" && body.dueDate ? body.dueDate : undefined,
    }

    const task = await createTask(input, { id: user.id, name: user.name })
    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
