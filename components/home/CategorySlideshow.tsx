"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useEffect, useState } from "react"
import SectionHeading from "@/components/ui/SectionHeading"
import { useDragScroll } from "@/hooks/useDragScroll"

interface CategorySlide {
  category: string
  label: string
  image: string
}

interface Props {
  slides: CategorySlide[]
}

export default function CategorySlideshow({ slides }: Props) {
  const desktopTrackRef = useRef<HTMLDivElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileAutoScrollRef = useRef(true)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [desktopPaused, setDesktopPaused] = useState(false)
  const { isAnimating: desktopDragAnimating, isPressed: desktopPressed } = useDragScroll(desktopTrackRef)

  // Duplicate for infinite loop (scrollLeft wraps at halfway)
  const loopSlides = [...slides, ...slides]

  // Desktop auto-scroll (rAF-driven scrollLeft). Pauses on hover, during
  // the pre-threshold press window, during the active drag, AND through the
  // momentum tail so motion never compounds with the user's input.
  useEffect(() => {
    const el = desktopTrackRef.current
    if (!el) return
    let raf: number
    let acc = 0
    const speed = 0.45 // px/frame (~27px/s)
    function step() {
      if (el && !desktopPaused && !desktopPressed && !desktopDragAnimating) {
        acc += speed
        if (acc >= 1) {
          const px = Math.floor(acc)
          el.scrollLeft += px
          acc -= px
        }
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [desktopPaused, desktopPressed, desktopDragAnimating])

  function handleScrollBy(dir: "left" | "right") {
    const el = desktopTrackRef.current
    if (!el) return
    const amount = el.clientWidth / 5.6 // one slide-width at desktop layout
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" })
  }

  // Mobile auto-scroll (unchanged from original)
  useEffect(() => {
    const el = mobileTrackRef.current
    if (!el) return
    let raf: number
    let acc = 0
    const speed = 0.5
    function step() {
      if (mobileAutoScrollRef.current && el) {
        acc += speed
        if (acc >= 1) {
          const px = Math.floor(acc)
          el.scrollLeft += px
          acc -= px
        }
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  function onMobileTouchStart() {
    mobileAutoScrollRef.current = false
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }

  function onMobileTouchEnd() {
    resumeTimerRef.current = setTimeout(() => {
      mobileAutoScrollRef.current = true
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
              className="flex-shrink-0 relative overflow-hidden ring-1 ring-inset ring-white/40"
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
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1 px-1.5">
                <img
                  src={`/category-icons/${slide.category}.svg`}
                  alt=""
                  className="h-[28px] w-[28px] opacity-95 flex-shrink-0"
                />
                <span className="text-white text-[10px] font-semibold leading-tight text-center line-clamp-1">{slide.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Desktop: rAF scrollLeft auto-scroll + drag-to-scroll ─── */}
      <div
        className="relative group/slider hidden md:block"
        onMouseEnter={() => setDesktopPaused(true)}
        onMouseLeave={() => setDesktopPaused(false)}
      >
        <div ref={desktopTrackRef} className="overflow-x-auto no-scrollbar">
          <div className="flex gap-[2px]" style={{ width: "max-content" }}>
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
                    className="object-cover blur-[3px] scale-110 group-hover:scale-[1.18] group-hover:blur-[2px] transition-all duration-500"
                    sizes="20vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#1e2035]" />
                )}
                <div
                  className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
                  style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)" }}
                />
                <div className="absolute inset-0 flex items-center justify-center px-3">
                  <span className="bg-black/65 backdrop-blur-sm text-white font-extrabold text-base tracking-wide rounded-full inline-flex items-center justify-center gap-2.5 border border-white/10 px-6 py-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={`/category-icons/${slide.category}.svg`}
                      alt=""
                      className="h-[22px] w-[22px]"
                    />
                    {slide.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}
