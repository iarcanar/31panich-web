"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

export default function PromotionCouponsStrip() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    fetch("/api/coupons?active=true")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCoupons(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 10)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScroll()
    el.addEventListener("scroll", updateScroll, { passive: true })
    window.addEventListener("resize", updateScroll)
    return () => {
      el.removeEventListener("scroll", updateScroll)
      window.removeEventListener("resize", updateScroll)
    }
  }, [coupons, updateScroll])

  function scroll(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" })
  }

  if (loading) return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className="h-5 w-32 bg-[#1a1a28] rounded mb-4 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] h-[140px] bg-[#1a1a28] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )

  if (coupons.length === 0) return null

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-white">🎟️ เก็บคูปอง</h2>
            <p className="text-xs text-white/40 mt-0.5">รับได้เฉพาะบนเว็บเท่านั้น</p>
          </div>
          <Link
            href="/promotions"
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Arrows (desktop) */}
          {canLeft && (
            <button
              onClick={() => scroll(-1)}
              className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10
                w-8 h-8 rounded-full bg-[#1a1a28] border border-white/10 items-center justify-center
                text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              ‹
            </button>
          )}
          {canRight && (
            <button
              onClick={() => scroll(1)}
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10
                w-8 h-8 rounded-full bg-[#1a1a28] border border-white/10 items-center justify-center
                text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              ›
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
          >
            {coupons.slice(0, 5).map((c) => (
              <div key={c.id} className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start">
                <CouponCard coupon={c} />
              </div>
            ))}
          </div>

          {/* Mobile scroll hint fade */}
          {canRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent pointer-events-none md:hidden" />
          )}
        </div>
      </div>
    </section>
  )
}
