import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getAllClaims, getClaimsForCoupon } from "@/lib/coupon-claims"

/** GET — ดึงประวัติการรับคูปอง (admin only) */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 })
    }

    const couponId = req.nextUrl.searchParams.get("couponId")

    if (couponId) {
      const claims = await getClaimsForCoupon(couponId)
      return NextResponse.json({ claims })
    }

    const claims = await getAllClaims()
    return NextResponse.json({ claims })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
