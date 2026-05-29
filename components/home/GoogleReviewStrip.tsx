"use client"

import { useMemo } from "react"
import REVIEWS from "@/data/reviews.json"

const REVIEW_LINK = "https://g.page/r/CQqFVNTPITMGEBM/review"

export default function GoogleReviewStrip() {
  const loopReviews = useMemo(() => [...REVIEWS, ...REVIEWS], [])
  const duration = REVIEWS.length * 8

  return (
    <section className="bg-[#0e0e14] overflow-hidden border-b border-white/[0.04]">
      <div className="flex items-center gap-3 py-3 px-4 max-w-6xl mx-auto">
        {/* Left: Google review label — pill for prominence */}
        <a
          href={REVIEW_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 pl-2 pr-2.5 py-1 hover:bg-white/10 transition"
        >
          {/* Google "G" */}
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          <span className="text-amber-400 text-[13px] leading-none review-stars-shimmer">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span className="text-white/85 text-[11px] font-semibold whitespace-nowrap">รีวิวจาก Google &rarr;</span>
        </a>

        {/* Right: scrolling reviews */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-6 z-10" style={{ background: "linear-gradient(to right, #0e0e14, transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-6 z-10" style={{ background: "linear-gradient(to left, #0e0e14, transparent)" }} />

          <div
            className="flex gap-8"
            style={{
              width: "max-content",
              animation: `reviewScroll ${duration}s linear infinite`,
            }}
          >
            {loopReviews.map((r, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-white/70 text-[12px] font-semibold whitespace-nowrap">{r.name}</span>
                <span className="text-amber-400/50 text-[12px]">&ldquo;</span>
                <span className="text-gray-300 text-[12px] whitespace-nowrap">{r.text}</span>
                <span className="text-amber-400/50 text-[12px]">&rdquo;</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes reviewScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes starShimmer {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(251,191,36,0.3)); }
          50% { filter: drop-shadow(0 0 8px rgba(251,191,36,0.7)); }
        }
        .review-stars-shimmer {
          animation: starShimmer 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}
