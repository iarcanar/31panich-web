import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/products"
import { getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const q = (req.nextUrl.searchParams.get("q") || "").trim()
    if (q.length < 2) return NextResponse.json([])

    const results = await searchProducts(q)
    const qLower = q.toLowerCase()

    // SKU ตรงเป๊ะ (case-insensitive) ขึ้นก่อนเสมอ — sort เสถียร (V8) จึงคงลำดับเดิมของผลที่เหลือ
    const sorted = [...results].sort((a, b) => {
      const aExact = a.sku.toLowerCase() === qLower ? 0 : 1
      const bExact = b.sku.toLowerCase() === qLower ? 0 : 1
      return aExact - bExact
    })

    const trimmed = sorted.slice(0, 20).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      image: p.image,
      price: p.price,
      category: p.category,
    }))

    return NextResponse.json(trimmed)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
