import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { resetClaimCount } from "@/lib/coupons"
import { removeAllClaimsForCoupon } from "@/lib/coupon-claims"

/** POST { couponId } — ล้างข้อมูลการรับคูปองทั้งหมด (admin only) */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { couponId } = await req.json()
    if (!couponId) return NextResponse.json({ error: "missing couponId" }, { status: 400 })

    // ล้าง claims ทั้งหมดของคูปองนี้
    const removedCount = await removeAllClaimsForCoupon(couponId)

    // Reset count กลับเป็น 0
    await resetClaimCount(couponId)

    return NextResponse.json({ removedCount, newCount: 0 })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
