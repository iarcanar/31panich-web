"use client"

import { useEffect, useRef, useState } from "react"

type Theme = "amber" | "purple" | "red" | "cyan" | "emerald"

interface Props {
  title: string
  subtitle?: string
  theme?: Theme
  badge?: string
  icon?: string
  hero?: React.ReactNode  // optional element rendered above badge (e.g. logo image)
}

const THEMES: Record<Theme, { rgb: string; badgeCls: string }> = {
  amber:   { rgb: "245, 158, 11",  badgeCls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  purple:  { rgb: "168, 85, 247",  badgeCls: "bg-purple-500/15 text-purple-300 border-purple-500/40" },
  red:     { rgb: "239, 68, 68",   badgeCls: "bg-red-500/15 text-red-300 border-red-500/40" },
  cyan:    { rgb: "34, 211, 238",  badgeCls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40" },
  emerald: { rgb: "16, 185, 129",  badgeCls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
}

/** Thai-safe letter split via grapheme clusters. Keeps tone marks/vowels attached. */
function splitLetters(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const SegmenterCtor = (Intl as unknown as {
        Segmenter: new (locale: string, opts: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> }
      }).Segmenter
      const seg = new SegmenterCtor("th", { granularity: "grapheme" })
      return Array.from(seg.segment(text), (s) => s.segment)
    } catch { /* fall through */ }
  }
  return Array.from(text)
}

/**
 * One-shot entrance animation for section headings. GPU-only (transform + opacity).
 * Re-animates each time the header re-enters viewport after leaving. Respects
 * `prefers-reduced-motion`. Uses two IntersectionObservers for show/hide hysteresis
 * (show at ≥25%, hide only when fully out) to avoid flicker during slow scroll.
 *
 * Glow layers are intentionally NOT clipped (no overflow-hidden) so they blend
 * seamlessly across section backgrounds on mobile.
 */
export default function SectionHeader({
  title,
  subtitle,
  theme = "amber",
  badge,
  icon,
  hero,
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const letters = splitLetters(title)
  const t = THEMES[theme]

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true)
      return
    }

    // Two-observer hysteresis:
    // - showObserver fires at ≥25% visibility → reveal
    // - hideObserver fires at 0% visibility (fully out) → reset
    // Between 0-25% nothing changes, preventing flicker when scrolling slowly.
    const showObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setRevealed(true)
        }
      },
      { threshold: 0.25 }
    )
    const hideObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) setRevealed(false)
        }
      },
      { threshold: 0 }
    )

    showObserver.observe(el)
    hideObserver.observe(el)

    return () => {
      showObserver.disconnect()
      hideObserver.disconnect()
    }
  }, [])

  const staggerMs = 32
  const lastLetterDelay = 120 + Math.max(0, letters.length - 1) * staggerMs
  const underlineDelay = lastLetterDelay + 100
  const subtitleDelay = underlineDelay + 150

  return (
    <div ref={ref} className="relative py-5 md:py-9">
      {/* Ambient glow — extends beyond container bounds to blend with section backgrounds.
          No overflow-hidden on the outer container; this div is absolute and can bleed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: "-28px",
          height: "220px",
          background: `radial-gradient(ellipse 70% 55% at 50% 45%, rgba(${t.rgb}, 0.30), transparent 72%)`,
          opacity: revealed ? 1 : 0,
          transform: revealed ? "scale(1)" : "scale(0.82)",
          transition: "opacity 600ms ease-out, transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: "80ms",
          willChange: "opacity, transform",
        }}
      />

      {/* Idle ambient pulse — only after reveal; single GPU layer */}
      {revealed && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 section-header-pulse"
          style={{
            top: "-20px",
            height: "180px",
            background: `radial-gradient(ellipse 55% 45% at 50% 50%, rgba(${t.rgb}, 0.14), transparent 72%)`,
          }}
        />
      )}

      <div className="relative">
        {/* Optional hero element (e.g. logo image) — scales in with spring */}
        {hero && (
          <div
            className="flex justify-center mb-2 md:mb-3"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "scale(1)" : "scale(0.85)",
              transition: "opacity 500ms ease-out, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              transitionDelay: "0ms",
            }}
          >
            {hero}
          </div>
        )}

        {/* Badge */}
        {badge && (
          <div
            className="flex justify-center mb-2 md:mb-3"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(-8px)",
              transition: "opacity 400ms ease-out, transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: "40ms",
            }}
          >
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border ${t.badgeCls}`}>
              {badge}
            </span>
          </div>
        )}

        {/* Heading with per-letter stagger */}
        <h2
          aria-label={title}
          className="relative text-2xl md:text-4xl font-bold text-center text-white flex justify-center items-baseline flex-wrap th-text"
          style={{
            textShadow: revealed ? `0 0 24px rgba(${t.rgb}, 0.35)` : "none",
            transition: "text-shadow 600ms ease-out",
            transitionDelay: `${underlineDelay}ms`,
          }}
        >
          {icon && (
            <span
              aria-hidden="true"
              className="inline-block mr-2"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "scale(1) rotate(0)" : "scale(0.4) rotate(-20deg)",
                transition: "opacity 500ms ease-out, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transitionDelay: "0ms",
              }}
            >
              {icon}
            </span>
          )}
          {letters.map((l, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="inline-block"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 420ms ease-out, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: `${120 + i * staggerMs}ms`,
                willChange: "opacity, transform",
              }}
            >
              {l === " " ? "\u00A0" : l}
            </span>
          ))}
        </h2>

        {/* Underline — scales from center */}
        <div className="flex justify-center mt-3 md:mt-4">
          <div
            className="h-[2px] rounded-full"
            style={{
              width: "clamp(80px, 18%, 180px)",
              background: `linear-gradient(90deg, transparent, rgb(${t.rgb}), transparent)`,
              transform: revealed ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "center",
              transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: `${underlineDelay}ms`,
              boxShadow: revealed ? `0 0 12px rgba(${t.rgb}, 0.6)` : "none",
            }}
          />
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-gray-400 text-center text-xs md:text-sm mt-3 md:mt-4 px-4 th-text"
            style={{
              opacity: revealed ? 0.7 : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 500ms ease-out, transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: `${subtitleDelay}ms`,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
