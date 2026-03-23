import Image from "next/image"
import Link from "next/link"
import { getProductsByCategory, CATEGORIES } from "@/lib/products"


export default async function CategoryGrid() {
  /* Build category cards with a random product image per category */
  const cards = await Promise.all(CATEGORIES.map(async (cat) => {
    const products = (await getProductsByCategory(cat.value)).filter((p) => p.image)
    const pick = products.length > 0
      ? products[Math.floor(Math.random() * products.length)]
      : null
    return {
      category: cat.value,
      label: cat.label,
      image: pick?.image ?? "",
      count: products.length,
    }
  }))

  return (
    <section className="relative bg-[#0e0e14] text-white py-10 md:py-14 overflow-hidden">
      {/* Blurred background image */}
      <Image
        src="/bg_2026_theme01.webp"
        alt=""
        fill
        className="object-cover blur-md scale-105 opacity-20 pointer-events-none"
        sizes="100vw"
        priority
      />
      <div className="relative z-10 container mx-auto px-4">
        <h2 className="text-xl md:text-3xl font-bold text-center mb-1">
          หมวดหมู่สินค้า
        </h2>
        <p className="text-gray-400 text-center text-sm mb-8 md:mb-10">
          เลือกหมวดหมู่ที่ต้องการ
        </p>

        {/* ─── Category icon grid ─── */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-3">
          {cards.map((card) => (
            <Link
              key={card.category}
              href={`/products/${card.category}`}
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              {/* Background image */}
              {card.image ? (
                <Image
                  src={card.image}
                  alt={card.label}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 14vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[#1e2035]" />
              )}

              {/* Dark overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
                style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)" }}
              />

              {/* Label with icon */}
              <div className="absolute inset-[4px] flex items-center justify-center">
                <span className="bg-black/55 backdrop-blur-sm text-white font-bold rounded-lg w-full h-full inline-flex flex-col items-center justify-center gap-1.5 md:gap-2 border border-white/10 px-1">
                  <img
                    src={`/category-icons/${card.category}.svg`}
                    alt=""
                    className="h-[22px] w-[22px] md:h-[28px] md:w-[28px] opacity-90"
                  />
                  <span className="text-[10px] md:text-xs leading-tight text-center line-clamp-2">
                    {card.label}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
