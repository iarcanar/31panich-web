import { NextRequest, NextResponse } from "next/server"
import { addComment } from "@/lib/tasks"
import { getSessionUser } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!text || text.length > 1000) {
      return NextResponse.json({ error: "text required, max 1000 chars" }, { status: 400 })
    }

    const task = await addComment(id, { authorId: user.id, authorName: user.name, text })
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 })

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
