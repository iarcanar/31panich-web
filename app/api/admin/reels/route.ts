import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createReel, reorderReels } from "@/lib/reels"
import { getSessionUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    if (!body.title || !body.poster || !body.facebookUrl) {
      return NextResponse.json({ error: "title, poster, facebookUrl required" }, { status: 400 })
    }

    const reel = await createReel({
      title: String(body.title),
      poster: String(body.poster),
      previewMp4: body.previewMp4 ? String(body.previewMp4) : undefined,
      facebookUrl: String(body.facebookUrl),
      active: body.active !== false,
      order: Number(body.order ?? 999),
    })

    revalidatePath("/")
    return NextResponse.json(reel, { status: 201 })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json()
    if (!Array.isArray(body.orderedIds)) {
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 })
    }
    await reorderReels(body.orderedIds.map(String))
    revalidatePath("/")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
