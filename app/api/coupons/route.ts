import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCoupons, getActiveCoupons, createCoupon } from "@/lib/coupons"

export async function GET(req: NextRequest) {
  const active = req.nextUrl.searchParams.get("active")
  const coupons = active === "true" ? getActiveCoupons() : getCoupons()
  return NextResponse.json(coupons)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.title || !body.discountType) {
    return NextResponse.json({ error: "title, discountType required" }, { status: 400 })
  }

  const coupon = createCoupon({
    code: body.code || "",
    title: body.title,
    description: body.description ?? "",
    image: body.image ?? "",
    discountType: body.discountType,
    discountValue: Number(body.discountValue ?? 0),
    giftDescription: body.giftDescription ?? "",
    category: body.category || null,
    minPurchase: Number(body.minPurchase ?? 0),
    startDate: body.startDate ?? new Date().toISOString(),
    endDate: body.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString(),
    isActive: body.isActive !== false,
    usageLimit: Number(body.usageLimit ?? 0),
  })

  revalidatePath("/")
  revalidatePath("/promotions")
  return NextResponse.json(coupon, { status: 201 })
}
