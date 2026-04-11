"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

// ─── Inline Ad Config ───────────────────────────────────
interface InlineAd {
  id: string
  image: string
  showFrom: string
  showTo: string
}

const INLINE_AD: InlineAd | null = {
  id: "songkran-2569",
  image: "/promotions/songkran-2569-popup.webp",
  showFrom: "2026-04-11",
  showTo: "2026-04-16",
}

function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

function isAdActive(ad: InlineAd | null): boolean {
  if (!ad) return false
  const today = todayBangkok()
  return today >= ad.showFrom && today <= ad.showTo
}

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

  const showAd = isAdActive(INLINE_AD)

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

        {/* Grid: Coupons + Ad */}
        <div className={showAd ? "md:grid md:grid-cols-5 md:gap-5" : ""}>
          {/* Coupon carousel */}
          <div className={showAd ? "md:col-span-2" : ""}>
            <div className="relative">
              {/* Arrows (desktop) — only when no ad (full width mode) */}
              {!showAd && canLeft && (
                <button
                  onClick={() => scroll(-1)}
                  className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10
                    w-8 h-8 rounded-full bg-[#1a1a28] border border-white/10 items-center justify-center
                    text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ‹
                </button>
              )}
              {!showAd && canRight && (
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

          {/* Inline Ad Banner */}
          {showAd && INLINE_AD && (
            <div className="md:col-span-3 mt-4 md:mt-0">
              <div className="relative bg-[#12121c] border border-purple-500/15 rounded-2xl overflow-hidden h-full flex flex-col">
                {/* Image */}
                <div className="relative w-full flex-1 min-h-[200px]">
                  <Image
                    src={INLINE_AD.image}
                    alt="โปรโมชั่นสงกรานต์ 2569"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                </div>

                {/* Text overlay bar */}
                <div className="px-4 py-3 bg-gradient-to-t from-[#12121c] via-[#12121c] to-[#12121c]/95">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        🎉 สุขสันต์วันสงกรานต์ 🌊
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5 truncate">
                        ขอให้ทุกท่านเดินทางปลอดภัย สนุกกับวันหยุดนะคะ 🙏
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold">
                      <span className="text-red-400">🗓️ หยุด 12–16 เม.ย.</span>
                      <span className="text-emerald-400">✅ เปิด 17 เม.ย.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
