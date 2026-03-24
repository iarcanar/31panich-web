"use client"

const REVIEWS = [
  { name: "Supachai K.", text: "ของครบ ราคาดี พนักงานแนะนำสินค้าได้เป็นอย่างดี", rating: 5 },
  { name: "Nattapong S.", text: "ร้านใหญ่มาก ของเยอะ มีทุกอย่างที่ต้องการ ราคาไม่แพง", rating: 5 },
  { name: "Somkid P.", text: "สินค้าคุณภาพดี ราคาถูกกว่าที่อื่น บริการดีมาก", rating: 5 },
  { name: "Wichai T.", text: "ร้านวัสดุก่อสร้างที่ดีที่สุดในลพบุรี ครบจบที่เดียว", rating: 5 },
  { name: "Pranee M.", text: "ซื้อสีผสมที่นี่ทุกครั้ง สีสวย ตรงเฉด บริการดี", rating: 5 },
  { name: "Kittisak R.", text: "เครื่องมือช่างของแท้ ราคาส่ง มีรับประกันด้วย", rating: 5 },
]

const REVIEW_LINK = "https://g.page/r/CQqFVNTPITMGEBM/review"

export default function GoogleReviewStrip() {
  const loopReviews = [...REVIEWS, ...REVIEWS]
  const duration = REVIEWS.length * 8

  return (
    <section className="bg-[#0e0e14] overflow-hidden border-b border-white/[0.04]">
      <div className="flex items-center gap-3 py-2.5 px-4 max-w-6xl mx-auto">
        {/* Left: static label */}
        <a
          href={REVIEW_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 hover:opacity-80 transition"
        >
          <span className="text-amber-400 text-xs review-stars-shimmer">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span className="text-amber-400/70 text-[10px] font-medium whitespace-nowrap">รีวิว &rarr;</span>
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
                <span className="text-white/40 text-[11px] font-medium whitespace-nowrap">{r.name}</span>
                <span className="text-gray-500/60 text-[11px]">&ldquo;</span>
                <span className="text-gray-400 text-[11px] whitespace-nowrap">{r.text}</span>
                <span className="text-gray-500/60 text-[11px]">&rdquo;</span>
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
