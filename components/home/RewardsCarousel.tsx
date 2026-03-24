"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, useEffect, useCallback } from "react"
import ScrollGlowFrame from "@/components/ui/ScrollGlowFrame"
import ScrollAccentLine from "@/components/ui/ScrollAccentLine"
import { SHAPE_PRESETS } from "@/components/ui/ScrollGlowFrame"

// ไม่รวม cooker + zootopia เพราะแสดงในโซนโปรโมชั่นแล้ว
const REWARDS = [
  { image: "/points/reward-200.webp", name: "สว่านกระแทกไร้สาย BOXER 128V 3 ระบบ", points: 200 },
  { image: "/points/reward-50.webp", name: "กล่องตั้งแคมป์ อเนกประสงค์ พับเก็บได้", points: 50 },
  { image: "/points/reward-40-60.webp", name: "เก้าอี้แคมป์ปิ้ง พับเก็บได้", points: 40 },
  { image: "/points/reward-40-lamp.webp", name: "โคมตะเกียงแคมป์ปิ้ง ชาร์จแบต/ใส่ถ่าน", points: 40 },
  { image: "/points/reward-20-glass.webp", name: "แก้วเก็บความเย็น เย็นนาน เย็นเจี๊ยบ", points: 20 },
]

export default function RewardsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 200
    const idx = Math.round(el.scrollLeft / (cardWidth + 16))
    setActiveIdx(Math.min(idx, REWARDS.length - 1))
  }, [])

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
    el.scrollBy({ left: dir === "left" ? -(cardWidth + 16) : cardWidth + 16, behavior: "smooth" })
  }

  function scrollToIdx(idx: number) {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 200
    el.scrollTo({ left: idx * (cardWidth + 16), behavior: "smooth" })
  }

  const pointsColor = (pts: number) => {
    if (pts >= 200) return "from-amber-400 to-yellow-500"
    if (pts >= 100) return "from-purple-400 to-fuchsia-500"
    if (pts >= 40) return "from-cyan-400 to-blue-500"
    return "from-emerald-400 to-teal-500"
  }

  const totalCards = REWARDS.length + 1 // +1 for "see more" card
  const dotCount = Math.min(totalCards, 6)

  return (
    <section className="bg-gradient-to-b from-[#0e0e14] via-[#12121f] to-[#0e0e14] py-8 md:py-14">
      <div className="container mx-auto px-4">
        <ScrollGlowFrame offsetTop={-20} color={[217, 158, 40]} shapes={SHAPE_PRESETS.golden}>
          <div className="pt-4 pb-2 md:pt-8 md:pb-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-2 pr-4 md:pr-8">
          <div className="flex items-center gap-3">
            <Image src="/31point.webp" alt="31 Points" width={80} height={80} className="w-[72px] h-[72px] md:w-20 md:h-20 drop-shadow-[0_0_14px_rgba(217,158,40,0.6)]" />
            <div>
              <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-1">31 POINTS</p>
              <h2 className="text-xl md:text-3xl font-bold text-white">
                แลกแต้มสามหนึ่ง
              </h2>
              <ScrollAccentLine color={[217, 158, 40]} width={48} />
            </div>
          </div>
          <Link href="/points" className="text-amber-400 text-xs md:text-sm font-semibold hover:text-amber-300 transition whitespace-nowrap">
            ดูทั้งหมด &rarr;
          </Link>
        </div>
          </div>
        </ScrollGlowFrame>

        {/* Carousel */}
        <div className="relative group/carousel">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pt-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {REWARDS.map((item, i) => (
              <Link
                key={i}
                href="/points"
                data-card
                className="flex-shrink-0 w-[55vw] sm:w-[40vw] md:w-[calc(25%-1rem)] lg:w-[calc(20%-1rem)] snap-start group"
              >
                <div className="bg-[#1a1a28] rounded-2xl border border-white/10 overflow-hidden hover:border-amber-400/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.97] transition-all duration-300">
                  {/* Image */}
                  <div className="aspect-square bg-[#252540] relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 55vw, (max-width: 768px) 40vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  </div>

                  <div className="p-3.5 flex items-end justify-between gap-2">
                    <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">{item.name}</h3>
                    <span className={`shrink-0 bg-gradient-to-r ${pointsColor(item.points)} text-white text-[11px] font-bold px-2 py-0.5 rounded-md`}>
                      {item.points} แต้ม
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {/* See more card */}
            <Link
              href="/points"
              data-card
              className="flex-shrink-0 w-[55vw] sm:w-[40vw] md:w-[calc(25%-1rem)] lg:w-[calc(20%-1rem)] snap-start group"
            >
              <div className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 rounded-2xl border border-amber-400/20 overflow-hidden hover:border-amber-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 h-full flex flex-col items-center justify-center aspect-[3/4] gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <p className="text-amber-400 font-bold text-sm">ดูของรางวัลทั้งหมด</p>
                <p className="text-gray-500 text-xs">อีก 4+ รายการ</p>
              </div>
            </Link>
          </div>

          {/* Nav arrows — desktop */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTo("left")}
              className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#1a1a28] border border-white/10 rounded-full items-center justify-center text-white hover:bg-white/10 transition shadow-lg opacity-0 group-hover/carousel:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollTo("right")}
              className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#1a1a28] border border-white/10 rounded-full items-center justify-center text-white hover:bg-white/10 transition shadow-lg opacity-0 group-hover/carousel:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}

          {/* Dots — mobile (padded for 44px touch target) */}
          <div className="flex justify-center mt-2 md:hidden">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                className="py-4 px-1.5 flex items-center justify-center"
                aria-label={`Go to slide ${i + 1}`}
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx ? "w-6 bg-amber-400" : "w-1.5 bg-white/20"
                }`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
