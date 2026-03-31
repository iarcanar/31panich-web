import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCoupons, getActiveCoupons, getTestCoupons, createCoupon } from "@/lib/coupons"

export async function GET(req: NextRequest) {
  try {
    const active = req.nextUrl.searchParams.get("active")
    const test = req.nextUrl.searchParams.get("test")
    const coupons = test === "true" ? await getTestCoupons() : active === "true" ? await getActiveCoupons() : await getCoupons()
    return NextResponse.json(coupons)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.title || !body.discountType) {
      return NextResponse.json({ error: "title, discountType required" }, { status: 400 })
    }
    if (!["percent", "fixed", "gift"].includes(body.discountType)) {
      return NextResponse.json({ error: "invalid discountType" }, { status: 400 })
    }

    const discountValue = Number(body.discountValue ?? 0)
    const minPurchase = Number(body.minPurchase ?? 0)
    const usageLimit = Number(body.usageLimit ?? 0)

    if (isNaN(discountValue) || discountValue < 0) {
      return NextResponse.json({ error: "invalid discountValue" }, { status: 400 })
    }
    if (isNaN(minPurchase) || minPurchase < 0) {
      return NextResponse.json({ error: "invalid minPurchase" }, { status: 400 })
    }
    if (isNaN(usageLimit) || usageLimit < 0) {
      return NextResponse.json({ error: "invalid usageLimit" }, { status: 400 })
    }

    const coupon = await createCoupon({
      code: body.code || "",
      title: body.title,
      description: body.description ?? "",
      image: body.image ?? "",
      discountType: body.discountType,
      discountValue,
      giftDescription: body.giftDescription ?? "",
      category: body.category || null,
      minPurchase,
      startDate: body.startDate ?? new Date().toISOString(),
      endDate: body.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString(),
      isActive: body.isActive !== false,
      usageLimit,
      stackWithPoints: body.stackWithPoints,
    })

    revalidatePath("/")
    revalidatePath("/promotions")
    return NextResponse.json(coupon, { status: 201 })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
