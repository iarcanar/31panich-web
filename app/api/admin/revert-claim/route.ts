import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { decrementClaimCount } from "@/lib/coupons"
import { removeLastClaim } from "@/lib/coupon-claims"

/** POST { couponId } — ลบ claim ล่าสุด + ลด count (admin only) */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { couponId } = await req.json()
    if (!couponId) return NextResponse.json({ error: "missing couponId" }, { status: 400 })

    // Remove last claim record
    const removed = await removeLastClaim(couponId)
    if (!removed) {
      return NextResponse.json({ error: "no claims to revert" }, { status: 404 })
    }

    // Decrement count
    const newCount = await decrementClaimCount(couponId)

    return NextResponse.json({
      removedSerial: removed.serial,
      removedId: removed.id,
      newCount,
    })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
