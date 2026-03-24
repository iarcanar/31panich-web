"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useEffect } from "react"
import SectionHeading from "@/components/ui/SectionHeading"

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
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Duplicate for infinite loop
  const loopSlides = [...slides, ...slides]

  // Desktop animation: ~15s per slide
  const duration = slides.length * 15

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

  // Mobile: auto-scroll via JS (allows touch swipe override)
  useEffect(() => {
    const el = mobileTrackRef.current
    if (!el) return
    let raf: number
    function step() {
      if (autoScrollRef.current && el) {
        el.scrollLeft += 0.25
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  function onMobileTouchStart() {
    autoScrollRef.current = false
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }

  function onMobileTouchEnd() {
    resumeTimerRef.current = setTimeout(() => {
      autoScrollRef.current = true
    }, 3000)
  }

  if (slides.length === 0) return null

  return (
    <section className="bg-[#0e0e14] py-8 md:py-14">
      {/* Section label */}
      <div className="container mx-auto px-4 mb-4 md:mb-5">
        <SectionHeading>เลือกดูตามหมวดหมู่</SectionHeading>
      </div>
      {/* ─── Mobile: auto-scroll + touch swipe ─── */}
      <div
        ref={mobileTrackRef}
        className="md:hidden overflow-x-auto no-scrollbar"
        onTouchStart={onMobileTouchStart}
        onTouchEnd={onMobileTouchEnd}
      >
        <div className="flex gap-[3px] w-max">
          {loopSlides.map((slide, i) => (
            <Link
              key={`m-${slide.category}-${i}`}
              href={`/products/${slide.category}`}
              className="flex-shrink-0 relative overflow-hidden"
              style={{ width: "calc(100vw / 4)", height: "clamp(80px, 22vw, 110px)" }}
            >
              {slide.image ? (
                <Image
                  src={slide.image}
                  alt={slide.label}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[#1e2035]" />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)" }}
              />
              <div className="absolute inset-[3px] flex flex-col items-center justify-center gap-1">
                <span className="bg-black/50 backdrop-blur-sm rounded-md w-full h-full inline-flex flex-col items-center justify-center gap-1 border border-white/10 px-1">
                  <img
                    src={`/category-icons/${slide.category}.svg`}
                    alt=""
                    className="h-[24px] w-[24px] opacity-90"
                  />
                  <span className="text-white/80 text-[9px] font-medium leading-tight text-center line-clamp-1">{slide.label}</span>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}
