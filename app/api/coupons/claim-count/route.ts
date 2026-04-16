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

    // Atomic: validate + check limit + increment ใน lock เดียว — ป้องกัน race condition + bypass
    const result = await atomicClaim(id)

    if (!result.ok) {
      const reason = result.reason || "error"
      const statusMap: Record<string, number> = {
        sold_out: 409,
        upcoming: 403,
        expired: 410,
        hidden: 404,
        not_found: 404,
      }
      return NextResponse.json({
        error: reason,
        count: result.count,
        soldOut: result.soldOut,
      }, { status: statusMap[reason] ?? 400 })
    }

    // บันทึก claim record + ส่ง serial กลับ
    const coupon = await getCouponById(id)
    let serial = ""
    if (coupon) {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      const ua = req.headers.get("user-agent") || "unknown"
      try {
        const record = await addClaim(id, coupon.code, coupon.serialPrefix || "A", ip, ua)
        serial = record.serial
      } catch {}
    }

    return NextResponse.json({ count: result.count, soldOut: result.soldOut, serial })
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }
}
