import { NextRequest, NextResponse } from "next/server"
import { getTaskById, updateTask, deleteTask, collectAttachmentUrls } from "@/lib/tasks"
import { getSessionUser } from "@/lib/auth"
import { destroyCloudinaryAsset } from "@/lib/cloudinary-delete"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await params
    const existing = await getTaskById(id)
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

    const body = await req.json()

    // สิทธิ์: ทุก role สั่งงาน/แก้ไข/ลบได้เท่ากัน (แบนราบตามเดิม) ยกเว้น "เดินสถานะ"
    // ซึ่งเป็นงานของทีมทำสื่อ — manager รายงานความคืบหน้าแทนกันไม่ได้
    if (Object.prototype.hasOwnProperty.call(body, "status") && user.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    // destroy Cloudinary เฉพาะเมื่อ body มี key "items" เท่านั้น — ไม่งั้น PUT แค่ {status:"done"}
    // จะไป diff attachment แล้วลบรูปทิ้งทั้งใบ
    const hasItems = Object.prototype.hasOwnProperty.call(body, "items")
    const prevUrls = hasItems ? collectAttachmentUrls(existing) : null

    const task = await updateTask(id, body)
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 })

    if (hasItems && prevUrls) {
      const nextUrls = new Set(collectAttachmentUrls(task))
      const removed = prevUrls.filter((url) => !nextUrls.has(url))
      for (const url of removed) {
        await destroyCloudinaryAsset(url, "image")
      }
    }

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await params
    const task = await deleteTask(id)
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 })

    const urls = collectAttachmentUrls(task)
    await Promise.all(urls.map((url) => destroyCloudinaryAsset(url, "image")))

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
