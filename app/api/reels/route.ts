import { NextRequest, NextResponse } from "next/server"
import { getActiveReels, getReels } from "@/lib/reels"

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all")
    const reels = all === "true" ? await getReels() : await getActiveReels()
    return NextResponse.json(reels)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
