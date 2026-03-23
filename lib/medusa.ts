// Medusa.js Storefront API Client

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function medusaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${MEDUSA_BACKEND_URL}/store${path}`, {
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 }, // ISR — revalidate ทุก 60 วินาที
  })
  if (!res.ok) throw new Error(`Medusa fetch failed: ${path}`)
  return res.json()
}

// Products
export async function getProductsByCategory(categorySlug: string) {
  const data = await medusaFetch<{ products: any[] }>(
    `/products?category_handle[]=${categorySlug}&limit=100`
  )
  return data.products
}

export async function getProductBySlug(handle: string) {
  const data = await medusaFetch<{ products: any[] }>(`/products?handle=${handle}`)
  return data.products[0] ?? null
}

export async function getFeaturedProducts(limit = 8) {
  const data = await medusaFetch<{ products: any[] }>(`/products?limit=${limit}`)
  return data.products
}

// Categories
export async function getCategories() {
  const data = await medusaFetch<{ product_categories: any[] }>("/product-categories")
  return data.product_categories
}

export async function getCategoryBySlug(handle: string) {
  const data = await medusaFetch<{ product_categories: any[] }>(
    `/product-categories?handle=${handle}`
  )
  return data.product_categories[0] ?? null
}

// Promotions — ดึงโปรโมชั่นที่ active อยู่
export async function getActivePromotions() {
  const data = await medusaFetch<{ promotions: any[] }>("/promotions?status=active")
  return data.promotions
}
