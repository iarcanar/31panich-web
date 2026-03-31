import { NextRequest, NextResponse } from "next/server"
import { atomicClaim, getCouponById } from "@/lib/coupons"
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

/** POST { id } — Atomic: ตรวจ limit + นับ +1 ใน lock เดียว + บันทึกประวัติ */
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

    // Atomic: check limit + increment ใน lock เดียว — ป้องกัน race condition
    const result = await atomicClaim(id)

    if (!result.ok) {
      return NextResponse.json({
        error: result.soldOut ? "sold_out" : "not_found",
        count: result.count,
        soldOut: result.soldOut,
      }, { status: result.soldOut ? 409 : 404 })
    }

    // บันทึก claim record สำหรับ admin ดูประวัติ
    const coupon = await getCouponById(id)
    if (coupon) {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      const ua = req.headers.get("user-agent") || "unknown"
      await addClaim(id, coupon.code, coupon.serialPrefix || "A", ip, ua).catch(() => {})
    }

    return NextResponse.json({ count: result.count, soldOut: result.soldOut })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
