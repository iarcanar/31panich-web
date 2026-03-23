import { NextRequest, NextResponse } from "next/server"
import { getCouponByCode, incrementUsage } from "@/lib/coupons"

export async function POST(req: NextRequest) {
  try {
    const { code, redeem } = await req.json()

    if (!code) {
      return NextResponse.json({ error: "code required" }, { status: 400 })
    }

    const coupon = await getCouponByCode(code)
    if (!coupon) {
      return NextResponse.json({ valid: false, reason: "ไม่พบรหัสคูปองนี้" })
    }

    const now = new Date().toISOString()
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, reason: "คูปองนี้ถูกปิดใช้งาน", coupon })
    }
    if (coupon.startDate > now) {
      return NextResponse.json({ valid: false, reason: "คูปองยังไม่เริ่มใช้งาน", coupon })
    }
    if (coupon.endDate < now) {
      return NextResponse.json({ valid: false, reason: "คูปองหมดอายุแล้ว", coupon })
    }
    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, reason: "คูปองถูกใช้ครบจำนวนแล้ว", coupon })
    }

    // Redeem: increment usage count
    if (redeem) {
      const updated = await incrementUsage(coupon.id)
      return NextResponse.json({ valid: true, reason: "ยืนยันการใช้คูปองสำเร็จ", coupon: updated })
    }

    return NextResponse.json({ valid: true, reason: "คูปองใช้ได้", coupon })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
