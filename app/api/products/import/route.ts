import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { bulkImportProducts } from "@/lib/products"
import type { Product } from "@/lib/products"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "body must be an array of products" }, { status: 400 })
    }

    // Validate each product has required fields
    for (let i = 0; i < body.length; i++) {
      const p = body[i]
      if (!p.name || !p.category) {
        return NextResponse.json({ error: `product[${i}] missing name or category` }, { status: 400 })
      }
    }

    // Ensure each product has required fields with defaults
    const products: Product[] = body.map((p: Record<string, unknown>) => ({
      id: (p.id as string) || crypto.randomUUID(),
      name: p.name as string,
      slug: (p.slug as string) || (p.name as string).toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || crypto.randomUUID().slice(0, 8),
      description: (p.description as string) ?? "",
      price: Number(p.price ?? 0),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      category: p.category as string,
      image: (p.image as string) ?? "",
      images: Array.isArray(p.images) ? p.images : [],
      stock: Number(p.stock ?? 0),
      isNew: Boolean(p.isNew),
      isBestseller: Boolean(p.isBestseller),
      isPinned: Boolean(p.isPinned),
      brand: (p.brand as string) ?? "",
      sku: (p.sku as string) ?? "",
      tags: Array.isArray(p.tags) ? p.tags : [],
      catalogId: (p.catalogId as string) ?? "",
      variants: Array.isArray(p.variants) ? p.variants : [],
      createdAt: (p.createdAt as string) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const result = await bulkImportProducts(products)

    revalidatePath("/")
    revalidatePath("/products")
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("[api/products/import]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
