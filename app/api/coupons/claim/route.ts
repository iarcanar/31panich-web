import { NextRequest, NextResponse } from "next/server"
import { getCouponById, claimCoupon } from "@/lib/coupons"

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const coupon = await getCouponById(id)
    if (!coupon) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    if (!coupon.isActive || coupon.startDate > now || coupon.endDate < now) {
      return NextResponse.json({ error: "coupon not available" }, { status: 400 })
    }
    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "coupon fully used" }, { status: 400 })
    }

    const result = await claimCoupon(id)
    if (!result) {
      return NextResponse.json({ error: "claim failed" }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
