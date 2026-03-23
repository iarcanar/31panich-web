import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getProducts, createProduct } from "@/lib/products"

export async function GET() {
  return NextResponse.json(await getProducts())
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.name || !body.category || body.price == null) {
    return NextResponse.json({ error: "name, category, price required" }, { status: 400 })
  }

  const product = await createProduct({
    name: body.name,
    description: body.description ?? "",
    price: Number(body.price),
    originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
    category: body.category,
    image: body.image ?? "",
    stock: Number(body.stock ?? 0),
    isNew: Boolean(body.isNew),
    isBestseller: Boolean(body.isBestseller),
    isPinned: Boolean(body.isPinned),
    brand: body.brand ?? "",
    sku: body.sku ?? "",
    tags: Array.isArray(body.tags) ? body.tags : [],
    variants: Array.isArray(body.variants) ? body.variants : [],
  })

  revalidatePath("/")
  revalidatePath("/products")
  return NextResponse.json(product, { status: 201 })
}
