"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useEffect, useCallback } from "react"
import DevEditLink from "./DevEditLink"

interface CarouselProduct {
  id: string
  name: string
  slug: string
  price: number
  originalPrice: number | null
  category: string
  categoryLabel: string
  image: string
  badge?: { text: string; color: string }
  discountPct?: number
}

interface ProductCarouselProps {
  products: CarouselProduct[]
  accentColor?: "cyan" | "emerald" | "red" | "purple"
  showDevEdit?: boolean
}

export default function ProductCarousel({ products, accentColor = "cyan", showDevEdit }: ProductCarouselProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const accentMap = {
    emerald: { text: "text-emerald-400", border: "hover:border-emerald-400/30", shadow: "hover:shadow-emerald-500/10", dot: "bg-emerald-400" },
    red:     { text: "text-red-400", border: "hover:border-red-400/30", shadow: "hover:shadow-red-500/10", dot: "bg-red-400" },
    purple:  { text: "text-purple-400", border: "hover:border-purple-400/30", shadow: "hover:shadow-purple-500/10", dot: "bg-purple-400" },
    cyan:    { text: "text-cyan-400", border: "hover:border-cyan-400/30", shadow: "hover:shadow-cyan-500/10", dot: "bg-cyan-400" },
  }
  const accent = accentMap[accentColor]

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)

    // Calculate active dot
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 200
    const gap = 16
    const idx = Math.round(el.scrollLeft / (cardWidth + gap))
    setActiveIdx(Math.min(idx, products.length - 1))
  }, [products.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    updateScrollState()
    return () => el.removeEventListener("scroll", updateScrollState)
  }, [updateScrollState])

  function scrollTo(dir: "left" | "right") {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 200
    const amount = cardWidth + 16
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  function scrollToIdx(idx: number) {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 200
    el.scrollTo({ left: idx * (cardWidth + 16), behavior: "smooth" })
  }

  // Number of visible dots (max 6 to keep it clean)
  const dotCount = Math.min(products.length, 6)

  return (
    <div className="relative group/carousel">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pt-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pr-16 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.category}/${encodeURIComponent(item.slug)}`}
            data-card
            className={`flex-shrink-0 w-[72vw] sm:w-[45vw] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1rem)] snap-start bg-[#1a1a28] rounded-2xl border border-white/10 overflow-hidden ${accent.border} ${accent.shadow} hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative`}
          >
            {/* Badge */}
            {item.badge && (
              <div className={`absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-md ${item.badge.color}`}>
                {item.badge.text}
              </div>
            )}

            {/* Image */}
            <div className="aspect-[4/3] bg-[#1e2035] relative overflow-hidden">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 72vw, (max-width: 768px) 45vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">รูปสินค้า</span>
                </div>
              )}
              {/* Sale % badge — top right */}
              {item.discountPct && item.discountPct > 0 && (
                <div className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-lg text-xs font-bold shadow-md ${item.discountPct >= 20 ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}>
                  -{item.discountPct}%
                </div>
              )}
            </div>

            <div className="p-4">
              <span
                className={`text-xs ${accent.text} font-medium cursor-pointer hover:underline`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(`/products/${item.category}`)
                }}
              >{item.categoryLabel}</span>
              <h3 className="text-sm font-semibold text-white mt-1 leading-snug line-clamp-2">{item.name}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-amber-400 font-bold">{item.price.toLocaleString()} .-</p>
                {item.originalPrice && (
                  <p className="text-gray-500 text-xs line-through">{item.originalPrice.toLocaleString()}</p>
                )}
              </div>
            </div>
            {/* DEV: ทางลัดแก้ไขสินค้า — ลบ block นี้เมื่อ deploy production */}
            {showDevEdit && <DevEditLink productId={item.id} size="sm" />}
          </Link>
        ))}
      </div>

      {/* Peek hint — right: semi-transparent gradient over peeking card + chevron */}
      {canScrollRight && (
        <button
          onClick={() => scrollTo("right")}
          className="absolute -right-4 md:right-0 top-0 bottom-0 z-10 w-14 md:w-16 flex items-center justify-center cursor-pointer"
          style={{ background: "linear-gradient(to right, transparent 0%, rgba(14,14,20,0.5) 50%, rgba(14,14,20,0.8) 100%)" }}
          aria-label="Scroll right"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
      {/* Peek hint — left */}
      {canScrollLeft && (
        <button
          onClick={() => scrollTo("left")}
          className="absolute -left-4 md:left-0 top-0 bottom-0 z-10 w-14 md:w-16 flex items-center justify-center cursor-pointer"
          style={{ background: "linear-gradient(to left, transparent 0%, rgba(14,14,20,0.5) 50%, rgba(14,14,20,0.8) 100%)" }}
          aria-label="Scroll left"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Dot indicators — mobile */}
      <div className="flex justify-center gap-1.5 mt-4 md:hidden">
        {Array.from({ length: dotCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIdx(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIdx
                ? `w-6 ${accent.dot}`
                : "w-1.5 bg-white/20"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
