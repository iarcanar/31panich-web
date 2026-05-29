"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

export interface FeedProduct {
  id: string
  name: string
  slug: string
  price: number
  originalPrice: number | null
  category: string
  categoryLabel: string
  image: string
  meta?: string
}

/**
 * Bottom-of-page "browse forever" grid (audit item A, 2026-05-29).
 * Server passes a shuffled product pool once (reuses the cached products read →
 * no extra Redis/quota). Client reveals +STEP per "ดูเพิ่ม" tap — purely a
 * client-side slice, never re-fetches. When the pool is exhausted it links to
 * the full catalog. Goal: satisfy "อยากดูสินค้าเล่นไปเรื่อยๆ" cheaply.
 */
const STEP = 8

export default function DiscoverFeedClient({ products }: { products: FeedProduct[] }) {
  const [visible, setVisible] = useState(12)
  const shown = products.slice(0, visible)
  const hasMore = visible < products.length

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {shown.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.category}/${encodeURIComponent(p.slug)}`}
            className="group bg-[#1a1a28] rounded-xl md:rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-emerald-400/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="relative aspect-[4/3] bg-[#1e2035] overflow-hidden">
              {p.image ? (
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">รูปสินค้า</span>
                </div>
              )}
            </div>
            <div className="p-2.5 md:p-3">
              <span className="text-[10px] text-emerald-400/80 font-medium th-text">{p.categoryLabel}</span>
              <h3 className="text-xs md:text-sm font-semibold text-white mt-0.5 leading-snug line-clamp-2 th-text">{p.name}</h3>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <p className="text-amber-400 font-bold text-sm">฿{p.price.toLocaleString()}</p>
                {p.originalPrice && (
                  <p className="text-gray-500 text-[11px] line-through">฿{p.originalPrice.toLocaleString()}</p>
                )}
              </div>
              {p.meta && <p className="text-[10px] text-gray-500 mt-1 th-text">{p.meta}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center mt-6 md:mt-8">
        {hasMore ? (
          <button
            onClick={() => setVisible((v) => v + STEP)}
            className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition active:scale-[0.98]"
          >
            ดูสินค้าเพิ่ม
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 text-sm font-semibold transition"
          >
            ดูสินค้าทั้งหมดในร้าน
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </>
  )
}
