import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getProductById, updateProduct, deleteProduct } from "@/lib/products"
import { getSessionUser, canPerform } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await getProductById(id)
    if (!product) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(product)
  } catch (err) {
    console.error("[api/products/GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const product = await updateProduct(id, body)
    if (!product) return NextResponse.json({ error: "not found" }, { status: 404 })
    revalidatePath("/")
    revalidatePath("/products")
    revalidatePath(`/products/${product.category}`)
    revalidatePath(`/products/${product.category}/${product.slug}`)
    return NextResponse.json(product)
  } catch (err) {
    console.error("[api/products/PUT]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !canPerform(user.role, "delete")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    const { id } = await params
    const product = await getProductById(id)
    const ok = await deleteProduct(id)
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
    revalidatePath("/")
    revalidatePath("/products")
    if (product) revalidatePath(`/products/${product.category}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/products/DELETE]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
