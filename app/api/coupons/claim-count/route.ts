import { NextRequest, NextResponse } from "next/server"
import { incrementClaimCount } from "@/lib/coupons"

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
    const count = await incrementClaimCount(id)
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
