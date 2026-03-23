import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCouponById, updateCoupon, deleteCoupon } from "@/lib/coupons"
import { getSessionUser, canPerform } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const coupon = getCouponById(id)
    if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(coupon)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const coupon = updateCoupon(id, body)
    if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
    revalidatePath("/")
    revalidatePath("/promotions")
    return NextResponse.json(coupon)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !canPerform(user.role, "delete")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    const { id } = await params
    const ok = deleteCoupon(id)
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
    revalidatePath("/")
    revalidatePath("/promotions")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
