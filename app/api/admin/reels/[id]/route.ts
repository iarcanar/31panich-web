import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { updateReel, deleteReel, getReelById } from "@/lib/reels"
import { getSessionUser, canPerform } from "@/lib/auth"
import { destroyCloudinaryAsset } from "@/lib/cloudinary-delete"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await params
    const existing = await getReelById(id)
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.title === "string") patch.title = body.title
    if (typeof body.poster === "string") patch.poster = body.poster
    if (typeof body.previewMp4 === "string") patch.previewMp4 = body.previewMp4
    if (body.previewMp4 === null) patch.previewMp4 = undefined
    if (typeof body.facebookUrl === "string") patch.facebookUrl = body.facebookUrl
    if (typeof body.active === "boolean") patch.active = body.active
    if (typeof body.order === "number") patch.order = body.order

    const reel = await updateReel(id, patch)
    if (!reel) return NextResponse.json({ error: "not found" }, { status: 404 })

    // Delete orphaned Cloudinary assets when replaced/cleared
    const orphans: Promise<unknown>[] = []
    if (existing.poster && reel.poster !== existing.poster) {
      orphans.push(destroyCloudinaryAsset(existing.poster, "image"))
    }
    if (existing.previewMp4 && reel.previewMp4 !== existing.previewMp4) {
      orphans.push(destroyCloudinaryAsset(existing.previewMp4, "video"))
    }
    if (orphans.length) await Promise.all(orphans)

    revalidatePath("/")
    return NextResponse.json(reel)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !canPerform(user.role, "delete-reel")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    const { id } = await params
    const reel = await getReelById(id)
    if (!reel) return NextResponse.json({ error: "not found" }, { status: 404 })

    // Hard-delete Cloudinary assets first (poster image + preview video)
    await Promise.all([
      reel.poster ? destroyCloudinaryAsset(reel.poster, "image") : Promise.resolve(false),
      reel.previewMp4 ? destroyCloudinaryAsset(reel.previewMp4, "video") : Promise.resolve(false),
    ])

    const ok = await deleteReel(id)
    if (!ok) return NextResponse.json({ error: "delete failed" }, { status: 500 })
    revalidatePath("/")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
