"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

const AD_IMAGE = "/promotions/songkran-2569-popup.webp"

export default function PromotionCouponsStrip() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

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

        {/* Grid: Coupons + Ad */}
        <div className="md:grid md:grid-cols-5 md:gap-5">
          {/* Coupon carousel */}
          <div className="md:col-span-2">
            <div className="relative">
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

          {/* Inline Ad — click to open popup */}
          <div className="md:col-span-3 mt-4 md:mt-0">
            <button
              onClick={() => setPopupOpen(true)}
              className="relative bg-[#12121c] border border-purple-500/15 hover:border-purple-500/30 rounded-2xl overflow-hidden h-full w-full flex flex-col cursor-pointer transition-colors group text-left"
            >
              <div className="relative w-full flex-1 min-h-[200px]">
                <Image
                  src={AD_IMAGE}
                  alt="โปรโมชั่นสงกรานต์ 2569"
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              </div>
              <div className="px-4 py-3">
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
            </button>
          </div>
        </div>
      </div>

      {/* Popup — triggered by clicking inline ad */}
      {popupOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setPopupOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#12121c] border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden">
              <button
                onClick={() => setPopupOpen(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                <Image
                  src={AD_IMAGE}
                  alt="โปรโมชั่นสงกรานต์ 2569"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 95vw, 512px"
                  priority
                />
              </div>

              <div className="px-5 py-4 space-y-3">
                <h2 className="text-center text-xl font-black text-white tracking-wide">
                  <span className="text-cyan-300">🎉</span> สุขสันต์วันสงกรานต์ <span className="text-cyan-300">🌊</span>
                </h2>
                <div className="text-center text-sm text-gray-300 leading-relaxed space-y-2">
                  <p>
                    วันนี้ <span className="text-white font-semibold">(11 เม.ย.)</span> เปิดร้านวันสุดท้ายก่อนหยุดยาว
                    <br />
                    หากต้องการสั่งของ แวะได้เลยก่อน <span className="text-amber-400 font-bold">17.30 น.</span>
                  </p>
                  <div className="flex items-center justify-center gap-4 py-1">
                    <div className="flex items-center gap-1.5 text-red-400">
                      <span className="text-base">🗓️</span>
                      <span className="font-semibold">หยุด 12–16 เมษายน</span>
                    </div>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="text-base">✅</span>
                      <span className="font-semibold">เปิด ศุกร์ 17 เม.ย.</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs">
                    ขอให้ทุกท่านเดินทางปลอดภัย ไปเล่นน้ำสนุกๆ กลับมาสุขภาพดีทุกคนนะคะ 🙏
                  </p>
                </div>
                <div className="flex justify-end pt-1 border-t border-white/5">
                  <button
                    onClick={() => setPopupOpen(false)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-400/10 transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
