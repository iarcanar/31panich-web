import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getProductById, updateProduct, deleteProduct } from "@/lib/products"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = getProductById(id)
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const product = updateProduct(id, body)
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 })
  revalidatePath("/")
  revalidatePath("/products")
  revalidatePath(`/products/${product.category}`)
  revalidatePath(`/products/${product.category}/${product.slug}`)
  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = getProductById(id)
  const ok = deleteProduct(id)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  revalidatePath("/")
  revalidatePath("/products")
  if (product) revalidatePath(`/products/${product.category}`)
  return NextResponse.json({ ok: true })
}
