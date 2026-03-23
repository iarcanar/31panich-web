import { NextRequest, NextResponse } from "next/server"
import { incrementClaimCount, getCouponById } from "@/lib/coupons"
import { addClaim } from "@/lib/coupon-claims"

/** GET ?id=xxx — ดึง claimCount ล่าสุด (real-time) */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
    const coupon = await getCouponById(id)
    if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
    const soldOut = coupon.usageLimit > 0 && coupon.claimCount >= coupon.usageLimit
    return NextResponse.json({ count: coupon.claimCount, usageLimit: coupon.usageLimit, soldOut })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}

/** POST { id, serial } — นับ +1 พร้อมตรวจ limit + บันทึกประวัติ */
export async function POST(req: NextRequest) {
  try {
    const { id, serial } = await req.json()
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

    // ตรวจ limit ก่อนนับ
    const coupon = await getCouponById(id)
    if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
    if (coupon.usageLimit > 0 && coupon.claimCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "sold_out", count: coupon.claimCount, soldOut: true }, { status: 409 })
    }

    const count = await incrementClaimCount(id)
    const soldOut = coupon.usageLimit > 0 && count >= coupon.usageLimit

    // บันทึก claim record สำหรับ admin ดูประวัติ
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const ua = req.headers.get("user-agent") || "unknown"
    await addClaim(id, coupon.code, coupon.serialPrefix || "A", ip, ua).catch(() => {})

    return NextResponse.json({ count, soldOut })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
