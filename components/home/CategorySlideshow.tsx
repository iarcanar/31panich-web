"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"

interface CategorySlide {
  category: string
  label: string
  image: string
}

interface Props {
  slides: CategorySlide[]
}

export default function CategorySlideshow({ slides }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  // Duplicate for infinite CSS loop
  const loopSlides = [...slides, ...slides]
  const mobileLoopSlides = [...slides, ...slides]

  // Slow scroll: ~15s per slide on desktop, ~8s on mobile (faster)
  const duration = slides.length * 15
  const mDuration = slides.length * 8

  function handlePause() {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused"
  }
  function handleResume() {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running"
  }

  function handleScrollBy(dir: "left" | "right") {
    const track = trackRef.current
    if (!track) return
    const anims = track.getAnimations()
    if (anims.length === 0) return
    const anim = anims[0]
    const jumpMs = (duration * 1000) / slides.length
    const current = (anim.currentTime as number) || 0
    const totalMs = duration * 1000
    const next = ((current + (dir === "right" ? jumpMs : -jumpMs)) % totalMs + totalMs) % totalMs
    anim.currentTime = next
  }

  if (slides.length === 0) return null

  return (
    <section className="bg-[#0e0e14] py-6 md:py-8">
      {/* Section label */}
      <div className="container mx-auto px-4 mb-4 md:mb-5">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
          <h2 className="text-sm md:text-lg font-bold text-white/80">เลือกดูตามหมวดหมู่</h2>
        </div>
      </div>
      {/* ─── Mobile: auto-slide (icon only) ─── */}
      <div className="md:hidden overflow-hidden">
        <div
          className="flex gap-[2px]"
          style={{
            width: "max-content",
            animation: `catSlideScrollMobile ${mDuration}s linear infinite`,
            willChange: "transform",
          }}
        >
          {mobileLoopSlides.map((slide, i) => (
            <Link
              key={`m-${slide.category}-${i}`}
              href={`/products/${slide.category}`}
              className="flex-shrink-0 relative overflow-hidden"
              style={{ width: "calc(100vw / 5.6)", height: "clamp(60px, 7.5vw, 85px)" }}
            >
              {slide.image ? (
                <Image
                  src={slide.image}
                  alt={slide.label}
                  fill
                  className="object-cover"
                  sizes="20vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[#1e2035]" />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)" }}
              />
              <div className="absolute inset-[3px] flex items-center justify-center">
                <span className="bg-black/50 backdrop-blur-sm rounded-md w-full h-full inline-flex items-center justify-center border border-white/10">
                  <img
                    src={`/category-icons/${slide.category}.svg`}
                    alt={slide.label}
                    className="h-[20px] w-[20px] opacity-90"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Desktop: auto-scroll with CSS animation ─── */}
      <div
        className="relative group/slider overflow-hidden hidden md:block"
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
      >
        <div
          ref={trackRef}
          className="flex gap-[2px]"
          style={{
            width: "max-content",
            animation: `catSlideScroll ${duration}s linear infinite`,
            willChange: "transform",
          }}
        >
          {loopSlides.map((slide, i) => (
            <Link
              key={`${slide.category}-${i}`}
              href={`/products/${slide.category}`}
              data-slide
              className="flex-shrink-0 relative overflow-hidden group"
              style={{ width: "calc(100vw / 5.6)", height: "clamp(70px, 8vw, 100px)" }}
            >
              {slide.image ? (
                <Image
                  src={slide.image}
                  alt={slide.label}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="20vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[#1e2035]" />
              )}
              <div
                className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
                style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)" }}
              />
              <div className="absolute inset-[4px] flex items-center justify-center">
                <span className="bg-black/60 backdrop-blur-sm text-white font-extrabold text-base tracking-wide rounded-lg w-full h-full inline-flex items-center justify-center gap-2.5 border border-white/10">
                  <img
                    src={`/category-icons/${slide.category}.svg`}
                    alt=""
                    className="h-[24px] w-[24px]"
                  />
                  {slide.label}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Left arrow button */}
        <button
          onClick={() => handleScrollBy("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16 cursor-pointer opacity-0 group-hover/slider:opacity-100 transition-opacity flex items-center justify-center"
          style={{ background: "linear-gradient(to right, rgba(14,14,20,0.95) 0%, rgba(14,14,20,0.6) 60%, transparent 100%)" }}
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow button */}
        <button
          onClick={() => handleScrollBy("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16 cursor-pointer opacity-0 group-hover/slider:opacity-100 transition-opacity flex items-center justify-center"
          style={{ background: "linear-gradient(to left, rgba(14,14,20,0.95) 0%, rgba(14,14,20,0.6) 60%, transparent 100%)" }}
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes catSlideScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes catSlideScrollMobile {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
