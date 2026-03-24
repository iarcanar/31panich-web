import Image from "next/image"
import Link from "next/link"
import { getBestsellers, getBestsellerPinnedProduct, CATEGORIES } from "@/lib/products"
import ProductCarousel from "./ProductCarousel"
import ScrollGlowFrame from "@/components/ui/ScrollGlowFrame"
import ScrollAccentLine from "@/components/ui/ScrollAccentLine"
import { SHAPE_PRESETS } from "@/components/ui/ScrollGlowFrame"
import DevEditLink from "./DevEditLink"

export default async function BestsellerSection() {
  const products = await getBestsellers(8)
  const hero = await getBestsellerPinnedProduct()

  if (products.length === 0 && !hero) return null

  // Exclude hero from carousel to avoid duplication
  const carouselProducts = products.filter((item) => !hero || item.id !== hero.id).map((item) => {
    const discountPct = item.originalPrice && item.originalPrice > item.price
      ? Math.round((1 - item.price / item.originalPrice) * 100)
      : 0
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      originalPrice: item.originalPrice,
      category: item.category,
      categoryLabel: CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category,
      image: item.image,
      discountPct,
    }
  })

  const heroCatLabel = hero
    ? CATEGORIES.find((c) => c.value === hero.category)?.label ?? hero.category
    : ""
  const heroDiscountPct = hero?.originalPrice && hero.originalPrice > hero.price
    ? Math.round((1 - hero.price / hero.originalPrice) * 100)
    : 0

  return (
    <section className="bg-[#0e0e14] py-8 md:py-14">
      <div className="container mx-auto px-4">
        <ScrollGlowFrame offsetTop={-20} color={[147, 51, 234]} shapes={SHAPE_PRESETS.cosmic}>
          <div className="py-1.5 md:pt-8 md:pb-4">
            <h2 className="text-xl md:text-3xl font-bold text-center text-white">
              สินค้าขายดี
            </h2>
            <ScrollAccentLine color={[147, 51, 234]} />
            <p className="text-gray-400 text-center text-sm mb-10 hidden md:block">
              สินค้ายอดนิยมที่ลูกค้าเลือกใช้มากที่สุด
            </p>
          </div>
        </ScrollGlowFrame>

        {/* Hero card for pinned product */}
        {hero && (
          <Link
            href={`/products/${hero.category}/${encodeURIComponent(hero.slug)}`}
            className="relative block mt-3 md:mt-0 mb-6 md:mb-8 bg-gradient-to-r from-[#1a1a28] to-[#1e2035] rounded-2xl border border-white/10 overflow-hidden hover:border-purple-400/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group"
          >
            {/* Hero badges — top right of card */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <span className="bg-fuchsia-500 text-white text-sm md:text-base font-bold px-3.5 py-1 md:px-4 md:py-1.5 rounded-lg shadow-lg">
                HOT
              </span>
              {heroDiscountPct > 0 && (
                <span className={`text-sm md:text-base font-bold px-3.5 py-1 md:px-4 md:py-1.5 rounded-lg shadow-lg ${heroDiscountPct >= 20 ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}>
                  SALE -{heroDiscountPct}%
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row">
              {/* Hero image — native ratio */}
              <div className="relative w-full md:w-1/2 bg-[#1e2035] overflow-hidden flex items-center justify-center">
                {hero.image ? (
                  <Image
                    src={hero.image}
                    alt={hero.name}
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full flex items-center justify-center min-h-[200px]">
                    <span className="text-gray-600 text-sm">รูปสินค้า</span>
                  </div>
                )}
              </div>

              {/* Hero info */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                <span className="text-xs text-purple-400 font-medium">{heroCatLabel}</span>
                <h3 className="text-lg md:text-2xl font-bold text-white mt-2 leading-snug">{hero.name}</h3>
                {hero.description && hero.description !== hero.name && (
                  <p className="text-gray-400 text-sm mt-3 line-clamp-3">{hero.description}</p>
                )}
                <div className="flex items-baseline gap-3 mt-4">
                  <p className="text-amber-400 font-bold text-xl md:text-2xl">{hero.price.toLocaleString()} .-</p>
                  {hero.originalPrice && hero.originalPrice > hero.price && (
                    <p className="text-gray-500 text-sm line-through">{hero.originalPrice.toLocaleString()} .-</p>
                  )}
                </div>
                <div className="mt-4">
                  <span className="inline-block bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-lg group-hover:bg-purple-500 transition-colors">
                    ดูรายละเอียด
                  </span>
                </div>
              </div>
            </div>
            {/* DEV: ทางลัดแก้ไขสินค้า — ลบ block นี้เมื่อ deploy production */}
            <DevEditLink productId={hero.id} />
          </Link>
        )}

        <ProductCarousel products={carouselProducts} accentColor="purple" showDevEdit />
      </div>
    </section>
  )
}
