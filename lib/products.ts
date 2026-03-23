import { readJSON, writeJSON } from "./blob-store"
export { CATEGORIES } from "./categories"
import { CATEGORIES } from "./categories"

// ─── Types ───────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  originalPrice: number | null
  category: string
  image: string
  images?: string[]
  stock: number
  isNew: boolean
  isBestseller: boolean
  isPinned: boolean
  brand: string
  sku: string
  tags?: string[]
  catalogId?: string
  variants?: { label: string; price: number; originalPrice?: number | null; stock: number }[]
  createdAt: string
  updatedAt: string
}

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">

// CATEGORIES is re-exported from ./categories (single source of truth)

// ─── Data helpers (async, dual-mode via blob-store) ─────
const FILE = "products.json"

async function readAll(): Promise<Product[]> {
  return await readJSON<Product[]>(FILE, [])
}

async function writeAll(products: Product[]): Promise<void> {
  await writeJSON(FILE, products)
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

// ─── Helpers ────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── CRUD ────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return (await readAll()).find((p) => p.id === id)
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await readAll()).find((p) => p.slug === slug)
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return (await readAll())
    .filter((p) => p.category === category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function searchProducts(query: string): Promise<Product[]> {
  const tokens = query.toLowerCase().replace(/\s+/g, " ").trim().split(" ")
  if (tokens.length === 0 || tokens[0] === "") return []
  return (await readAll())
    .filter((p) => {
      const hay = `${p.name} ${p.brand} ${p.sku} ${p.description} ${p.category}`.toLowerCase()
      return tokens.every((t) => hay.includes(t))
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
  const all = (await readAll()).filter((p) => p.price > 0 && p.stock > 0)
  // Flagged สุ่มลำดับ, เติมด้วย rest สุ่ม
  const flagged = shuffle(all.filter((p) => p.isNew))
  const rest = shuffle(all.filter((p) => !p.isNew))
  return [...flagged, ...rest].slice(0, limit)
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  const all = (await readAll()).filter((p) => p.price > 0 && p.stock > 0)
  // Flagged สุ่มลำดับ, เติมด้วย rest สุ่ม
  const flagged = shuffle(all.filter((p) => p.isBestseller))
  const rest = shuffle(all.filter((p) => !p.isBestseller))
  return [...flagged, ...rest].slice(0, limit)
}

// Zone-specific pinned hero: isNew + isPinned
export async function getNewPinnedProduct(): Promise<Product | null> {
  return (await readAll()).find((p) => p.isPinned && p.isNew && p.price > 0 && p.stock > 0) ?? null
}

// Zone-specific pinned hero: isBestseller + isPinned
export async function getBestsellerPinnedProduct(): Promise<Product | null> {
  return (await readAll()).find((p) => p.isPinned && p.isBestseller && p.price > 0 && p.stock > 0) ?? null
}

// Clear conflicting pins: only 1 pinned per zone (isNew / isBestseller)
function clearConflictingPins(products: Product[], target: { isNew: boolean; isBestseller: boolean }, excludeId?: string) {
  for (const p of products) {
    if (excludeId && p.id === excludeId) continue
    if (!p.isPinned) continue
    if ((target.isNew && p.isNew) || (target.isBestseller && p.isBestseller)) {
      p.isPinned = false
    }
  }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const products = await readAll()

  // Prevent hero card in both zones: pinned product can only be isNew OR isBestseller, not both
  if (input.isPinned && input.isNew && input.isBestseller) {
    input.isBestseller = false
  }

  // Auto-clear conflicting pins in same zone
  if (input.isPinned) {
    clearConflictingPins(products, input)
  }

  const now = new Date().toISOString()
  const product: Product = {
    ...input,
    id: crypto.randomUUID(),
    slug: toSlug(input.name) || crypto.randomUUID().slice(0, 8),
    createdAt: now,
    updatedAt: now,
  }
  products.push(product)
  await writeAll(products)
  return product
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const products = await readAll()
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return null

  // Merge to know final state of zones
  const merged = { ...products[idx], ...input }

  // Prevent hero card in both zones: pinned product can only be isNew OR isBestseller, not both
  if (merged.isPinned && merged.isNew && merged.isBestseller) {
    input.isBestseller = false
    merged.isBestseller = false
  }

  // Auto-clear conflicting pins in same zone
  if (merged.isPinned) {
    clearConflictingPins(products, merged, id)
  }

  products[idx] = {
    ...products[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  }
  if (input.name) {
    products[idx].slug = toSlug(input.name)
  }
  await writeAll(products)
  return products[idx]
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await readAll()
  const filtered = products.filter((p) => p.id !== id)
  if (filtered.length === products.length) return false
  await writeAll(filtered)
  return true
}
