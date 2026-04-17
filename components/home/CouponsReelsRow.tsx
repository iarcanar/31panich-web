"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Coupon } from "@/lib/coupons"
import type { Reel } from "@/types/reel"
import CouponCard from "@/components/coupon/CouponCard"
import ReelModal from "@/components/home/ReelModal"

export default function CouponsReelsRow() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/coupons?visible=true").then((r) => r.json()).catch(() => []),
      fetch("/api/reels").then((r) => r.json()).catch(() => []),
    ])
      .then(([c, r]) => {
        if (Array.isArray(c)) setCoupons(c)
        if (Array.isArray(r)) setReels(r)
      })
      .finally(() => setLoading(false))
  }, [])

  // Don't render at all if both sides empty (avoids ghost section)
  if (!loading && coupons.length === 0 && reels.length === 0) return null

  // Determine layout: only split when BOTH sides have data
  const hasCoupons = coupons.length > 0 || loading
  const hasReels = reels.length > 0
  const isSplit = hasCoupons && hasReels

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className={isSplit ? "grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8" : ""}>
          {hasCoupons && (
            <div className="min-w-0">
              <CouponsColumn coupons={coupons} loading={loading} />
            </div>
          )}
          {hasReels && (
            <div className="min-w-0">
              <ReelsColumn reels={reels} loading={false} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Coupons column (adapted from PromotionCouponsStrip) ────
function CouponsColumn({ coupons, loading }: { coupons: Coupon[]; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canRight, setCanRight] = useState(false)

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
    <>
      <div className="h-5 w-32 bg-[#1a1a28] rounded mb-4 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2].map((i) => (
          <div key={i} className="min-w-[260px] h-[240px] bg-[#1a1a28] rounded-2xl animate-pulse" />
        ))}
      </div>
    </>
  )

  if (coupons.length === 0) return null

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">🎟️ เก็บคูปอง</h2>
          <p className="text-xs text-white/40 mt-0.5">รับได้เฉพาะบนเว็บเท่านั้น</p>
        </div>
        <Link
          href="/promotions"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          ดูทั้งหมด →
        </Link>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-1 pr-2"
          style={{ isolation: "isolate" }}
        >
          {coupons.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className="relative min-w-[260px] max-w-[300px] h-[250px] flex-shrink-0 snap-start rounded-xl"
              style={{
                marginLeft: i > 0 ? "-36px" : 0,
                zIndex: coupons.length - i,
                boxShadow: i < coupons.length - 1 && coupons.length > 1
                  ? "10px 0 14px -4px rgba(0,0,0,0.65)"
                  : undefined,
              }}
            >
              <CouponCard coupon={c} />
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

        {canRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent pointer-events-none" />
        )}
      </div>
    </>
  )
}

// ─── Reels column ───────────────────────────────────────────
function ReelsColumn({ reels, loading }: { reels: Reel[]; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [openReel, setOpenReel] = useState<Reel | null>(null)
  const [canRight, setCanRight] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track active (most-centered) card via IntersectionObserver
  useEffect(() => {
    if (reels.length === 0) return
    const el = scrollRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        // Find entry with highest intersection ratio
        let best: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry
        }
        if (best && best.isIntersecting) {
          const idx = cardRefs.current.findIndex((r) => r === best!.target)
          if (idx !== -1) setActiveIdx(idx)
        }
      },
      {
        root: el,
        threshold: [0.5, 0.75, 1],
      }
    )

    cardRefs.current.forEach((card) => {
      if (card) io.observe(card)
    })
    return () => io.disconnect()
  }, [reels])

  // Scroll shadow hint
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
  }, [reels, updateScroll])

  if (loading) return (
    <>
      <div className="h-5 w-32 bg-[#1a1a28] rounded mb-4 animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[140px] h-[250px] bg-[#1a1a28] rounded-2xl animate-pulse" />
        ))}
      </div>
    </>
  )

  if (reels.length === 0) return null

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">🎬 Reel บน Facebook</h2>
          <p className="text-xs text-white/40 mt-0.5">แตะเพื่อเล่นเต็มจอ</p>
        </div>
        <a
          href="https://www.facebook.com/31panich"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          ไปที่เพจ →
        </a>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-1 pr-2"
        >
          {reels.map((r, i) => (
            <div
              key={r.id}
              ref={(el) => { cardRefs.current[i] = el }}
              className="relative min-w-[140px] max-w-[160px] aspect-[9/16] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-[#1a1a28] border border-white/10 cursor-pointer group"
              onClick={() => setOpenReel(r)}
            >
              {/* Poster */}
              <Image
                src={r.poster}
                alt={r.title}
                fill
                className="object-cover"
                sizes="160px"
                loading={i < 2 ? "eager" : "lazy"}
              />

              {/* Preview MP4 — plays only on active card + only if MP4 exists */}
              {r.previewMp4 && i === activeIdx && (
                <video
                  src={r.previewMp4}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="metadata"
                  aria-hidden="true"
                />
              )}

              {/* Gradient + play icon overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all ${i === activeIdx ? "opacity-0 scale-75" : "opacity-100 group-hover:opacity-80"}`}>
                  <svg className="w-4 h-4 text-white translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                <div className="text-[11px] text-white font-medium leading-tight line-clamp-2 drop-shadow-lg">
                  {r.title}
                </div>
              </div>

              {/* "เล่นอยู่" indicator on active card */}
              {r.previewMp4 && i === activeIdx && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
          ))}
        </div>

        {canRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent pointer-events-none" />
        )}
      </div>

      {openReel && (
        <ReelModal reel={openReel} onClose={() => setOpenReel(null)} />
      )}
    </>
  )
}
