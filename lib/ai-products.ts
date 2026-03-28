import { getProducts, getProductsByCategory, CATEGORIES, type Product } from "./products"
import { getCategoryLabel } from "./categories"

interface ScoredProduct {
  product: Product
  score: number
}

// ─── Module-level cache (ลดการอ่านซ้ำใน API routes) ─────
let _cachedProducts: Product[] | null = null
let _cachedCatSummary: string | null = null
let _cacheTs = 0
const PRODUCT_CACHE_TTL = 5 * 60 * 1000 // 5 นาที

async function getCachedProducts(): Promise<{ products: Product[]; catSummary: string }> {
  const now = Date.now()
  if (_cachedProducts && _cachedCatSummary && now - _cacheTs < PRODUCT_CACHE_TTL) {
    return { products: _cachedProducts, catSummary: _cachedCatSummary }
  }
  const products = await getProducts()
  const catCountMap: Record<string, number> = {}
  for (const p of products) {
    if (p.price > 0 && p.stock > 0) catCountMap[p.category] = (catCountMap[p.category] || 0) + 1
  }
  const catSummary = CATEGORIES.map((c) => `- ${c.label} (${catCountMap[c.value] || 0} รายการ)`).join("\n")
  _cachedProducts = products
  _cachedCatSummary = catSummary
  _cacheTs = now
  return { products, catSummary }
}

/** ข้อความที่ไม่เกี่ยวกับสินค้า — skip scoring เพื่อประหยัด CPU */
const NON_PRODUCT_PATTERNS = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey|ขอบคุณ|ขอบใจ|thanks|บาย|บ๊ายบาย|ลาก่อน|เปิดกี่โมง|ปิดกี่โมง|เปิดไหม|วันไหน|อยู่ไหน|แผนที่|ที่อยู่|เบอร์โทร|โทรศัพท์|ไลน์|line|จัดส่ง|ส่งของ|คืนสินค้า|เคลม|ประกัน|warranty|แต้ม|แลกแต้ม|สะสมแต้ม|point|reward|โปรโมชั่น|ลดราคา|คูปอง|coupon|ทำอะไรได้|ช่วยอะไร|คุณเป็นใคร|ชื่ออะไร)$/i

/** Extract key terms from product name for reverse matching (Thai has no spaces) */
function extractNameTerms(name: string): string[] {
  // Split by spaces, numbers, brands — keep Thai word chunks >= 3 chars
  return name
    .toLowerCase()
    .split(/[\s\d/\-()（）]+/)
    .filter((t) => t.length >= 3)
}

/** Score products against query — bidirectional matching for Thai */
function scoreProducts(userQuery: string, allProducts: Product[]): ScoredProduct[] {
  const products = allProducts
  const query = userQuery.toLowerCase().replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, "")

  // Forward: space-separated tokens from user query
  const queryWords = query.split(/\s+/).filter((w) => w.length > 1)
  // Full query without spaces for Thai substring matching
  const queryFlat = query.replace(/\s+/g, "")

  if (queryFlat.length < 2) return []

  return products
    .filter((p) => p.price > 0 && p.stock > 0)
    .map((p) => {
      let score = 0
      const name = p.name.toLowerCase()
      const brand = (p.brand || "").toLowerCase()
      const desc = (p.description || "").toLowerCase()
      const tags = (p.tags || []).join(" ").toLowerCase()
      const catLabel = getCategoryLabel(p.category).toLowerCase()

      // Forward matching: query tokens → product fields
      for (const w of queryWords) {
        if (name.includes(w)) score += 3
        if (brand.includes(w)) score += 2
        if (catLabel.includes(w)) score += 2
        if (desc.includes(w)) score += 1
        if (tags.includes(w)) score += 1
      }

      // Reverse matching: product name terms → user query (handles Thai no-space)
      const nameTerms = extractNameTerms(name)
      for (const term of nameTerms) {
        if (queryFlat.includes(term)) score += 3
      }
      // Also check brand in query
      if (brand && brand.length >= 2 && queryFlat.includes(brand)) score += 2

      // Substring matching: extract 3-8 char substrings from query → check in product name
      // Handles Thai queries like "มีสว่านมั้ย" matching product "สว่านกระแทก"
      if (score === 0) {
        const haystack = `${name} ${brand} ${tags}`
        let bestLen = 0
        for (let len = Math.min(8, queryFlat.length); len >= 3; len--) {
          for (let start = 0; start <= queryFlat.length - len; start++) {
            const sub = queryFlat.slice(start, start + len)
            if (haystack.includes(sub)) {
              bestLen = len
              break
            }
          }
          if (bestLen > 0) break
        }
        if (bestLen >= 3) score += bestLen >= 5 ? 4 : 3
      }

      return { product: p, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
}

/** Build product context for AI */
export async function buildChatContextWithProducts(userQuery: string) {
  const { products, catSummary } = await getCachedProducts()

  // Skip scoring for non-product queries (greetings, store info, etc.)
  const trimmed = userQuery.trim()
  if (NON_PRODUCT_PATTERNS.test(trimmed)) {
    return {
      context: `หมวดหมู่สินค้าในร้าน:\n${catSummary}\n\n(ข้อความนี้ไม่เกี่ยวกับสินค้า)`,
    }
  }

  const scored = scoreProducts(userQuery, products)

  if (scored.length === 0) {
    return {
      context: `หมวดหมู่สินค้าในร้าน:\n${catSummary}\n\n(ไม่พบสินค้าที่ตรงกับคำค้น)`,
      products: [],
    }
  }

  // For AI context: send top 5 details + summary count
  const totalMatched = scored.length
  const forContext = scored.slice(0, 5)
  const productLines = forContext.map(({ product: p }) => {
    const catLabel = getCategoryLabel(p.category)
    const desc = (p.description || "").slice(0, 80)
    const price = p.originalPrice && p.originalPrice > p.price
      ? `฿${p.price} (ปกติ ฿${p.originalPrice})`
      : `฿${p.price}`
    return `${p.name} | ${p.brand || "-"} | ${price} | สต็อก:${p.stock} | ${catLabel} | ${desc}`
  }).join("\n")
  const summaryNote = totalMatched > 5
    ? `\n(แสดง 5 จาก ${totalMatched} รายการ ระบบจะแสดงการ์ดสินค้าเพิ่มเติมให้ลูกค้าดูเอง ไม่ต้องลิสต์ทั้งหมด)`
    : ""

  return {
    context: `หมวดหมู่สินค้าในร้าน:\n${catSummary}\n\nสินค้าที่เกี่ยวข้อง (ชื่อจริงในระบบ — อ้างอิงเฉพาะสินค้าที่อยู่ในรายการนี้เท่านั้น):\n${productLines}${summaryNote}`,
  }
}

/** Build context for admin product enrichment */
export async function buildEnrichContext(product: Product): Promise<string> {
  const similar = (await getProductsByCategory(product.category))
    .filter((p) => p.id !== product.id && p.price > 0)
    .slice(0, 5)

  const productData = [
    `ชื่อ: ${product.name}`,
    `แบรนด์: ${product.brand || "-"}`,
    `SKU: ${product.sku || "-"}`,
    `ราคา: ฿${product.price}${product.originalPrice ? ` (ปกติ ฿${product.originalPrice})` : ""}`,
    `หมวดหมู่: ${getCategoryLabel(product.category)}`,
    `คำอธิบายปัจจุบัน: ${product.description || "(ไม่มี)"}`,
    `Tags: ${(product.tags || []).join(", ") || "(ไม่มี)"}`,
    `สต็อก: ${product.stock}`,
  ].join("\n")

  const similarData = similar.length > 0
    ? "\n\nสินค้าในหมวดเดียวกัน (อ้างอิง):\n" +
      similar.map((p) => `- ${p.name} | ${p.brand || "-"} | ฿${p.price}`).join("\n")
    : ""

  return productData + similarData
}
