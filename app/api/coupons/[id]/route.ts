import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCouponById, updateCoupon, deleteCoupon } from "@/lib/coupons"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coupon = getCouponById(id)
  if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(coupon)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const coupon = updateCoupon(id, body)
  if (!coupon) return NextResponse.json({ error: "not found" }, { status: 404 })
  revalidatePath("/")
  revalidatePath("/promotions")
  return NextResponse.json(coupon)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = deleteCoupon(id)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  revalidatePath("/")
  revalidatePath("/promotions")
  return NextResponse.json({ ok: true })
}
