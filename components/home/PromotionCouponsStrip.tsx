"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

export default function PromotionCouponsStrip() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    fetch("/api/coupons?visible=true")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCoupons(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
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

        {/* Coupon carousel — full width */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-1 pr-2"
            style={{ isolation: "isolate" }}
          >
            {coupons.slice(0, 5).map((c, i) => (
              <div
                key={c.id}
                className="relative min-w-[280px] max-w-[320px] h-[230px] flex-shrink-0 snap-start rounded-xl"
                style={{
                  marginLeft: i > 0 ? "-36px" : 0,
                  zIndex: coupons.length - i,
                  boxShadow: i < coupons.length - 1 && coupons.length > 1
                    ? "10px 0 14px -4px rgba(0,0,0,0.65)"
                    : undefined,
                }}
              >
                <CouponCard coupon={c} />
                {/* Shadow gradient บนด้านซ้ายของคูปองเก่ากว่า (เน้นว่าถูกใบใหม่ทับ) */}
                {i > 0 && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none rounded-l-xl z-[5]"
                    style={{
                      background: "linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.35) 50%, transparent)",
                    }}
                  />
                )}
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
