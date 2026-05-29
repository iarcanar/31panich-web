import { getProducts, CATEGORIES } from "@/lib/products"
import SectionHeader from "./SectionHeader"
import DiscoverFeedClient, { type FeedProduct } from "./DiscoverFeedClient"

/**
 * "เลื่อนดูเพลินๆ" discover feed at the bottom of the homepage (audit item A).
 * Pulls the full product list (reuses the request-cached read via getProducts →
 * readAll, so it adds NO extra Redis call on top of Bestseller/New), shuffles,
 * and hands a pool of up to 48 to a client grid that reveals more on tap.
 * Shuffle re-runs each ISR regen (hourly) → fresh ordering without per-request cost.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function DiscoverFeed() {
  const all = (await getProducts()).filter((p) => p.price > 0 && p.stock > 0)
  if (all.length < 6) return null

  const pool: FeedProduct[] = shuffle(all)
    .slice(0, 48)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.originalPrice,
      category: p.category,
      categoryLabel: CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category,
      image: p.image,
      meta: p.variants && p.variants.length > 1 ? `มี ${p.variants.length} แบบ` : undefined,
    }))

  return (
    <section className="bg-[#0e0e14] pt-4 pb-10 md:pt-8 md:pb-16 -mt-4 md:-mt-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader
          title="เลือกดูสินค้า"
          subtitle="ของในร้านมีอีกเพียบ เลื่อนดูเพลินๆ ได้เลย"
          theme="emerald"
          badge="Explore"
        />
        <DiscoverFeedClient products={pool} />
      </div>
    </section>
  )
}
