import Image from "next/image"
import Link from "next/link"
import SectionHeader from "./SectionHeader"
import type { Promotion } from "@/types/promotion"

interface Props {
  promotions: Promotion[]
}

/**
 * Uniform promo grid — 2 cols mobile / 3 tablet / 4 desktop.
 * Each card is `aspect-[4/5]` with title below. Entire card is a link
 * to the promo's FB post (or internal /points link for reward promos).
 * No CTA buttons (duplicated elsewhere on the page). Videos show a play
 * overlay on the poster instead of embedding an iframe.
 */
export default function PromoGrid({ promotions }: Props) {
  if (promotions.length === 0) return null

  return (
    <section className="bg-[#0e0e14] pt-4 pb-8 md:pt-8 md:pb-14 -mt-4 md:-mt-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader
          title="โปรโมชั่น"
          subtitle="ดีลเด็ดล่าสุดจากร้านสามหนึ่ง"
          theme="cyan"
          badge="Promotions"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {promotions.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function badgeClass(text: string): string {
  if (/แต้ม|points/i.test(text)) return "bg-amber-500 text-white"
  if (/new/i.test(text)) return "bg-cyan-500 text-white"
  if (/hot|sale/i.test(text)) return "bg-red-500 text-white"
  return "bg-white/25 text-white backdrop-blur-sm"
}

function PromoCard({ promo }: { promo: Promotion }) {
  const target = promo.ctaFacebook || promo.link
  const external = !!target && /^https?:\/\//.test(target)
  const hasVideo = !!promo.videoEmbed

  const cardInner = (
    <>
      {/* Image — aspect 4:5, center-cover */}
      <div className="relative w-full aspect-[4/5] bg-[#1e2035] overflow-hidden">
        <Image
          src={promo.image}
          alt={promo.title}
          fill
          className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 256px"
        />

        {/* Top gradient for badge + play icon contrast */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/50 via-black/15 to-transparent pointer-events-none" />

        {/* Badge */}
        {promo.badge && (
          <span
            className={`absolute top-2 left-2 text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md z-10 ${badgeClass(promo.badge)}`}
          >
            {promo.badge}
          </span>
        )}

        {/* Play overlay for video promos */}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/20 group-hover:bg-black/70 group-hover:scale-110 transition-all duration-300">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Title footer */}
      <div className="px-2.5 py-2 md:px-3 md:py-2.5">
        <h3 className="text-white text-xs md:text-sm font-semibold leading-snug line-clamp-2 th-text">
          {promo.title}
        </h3>
      </div>
    </>
  )

  const commonClasses =
    "block bg-[#1a1a28] rounded-xl md:rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 group hover:border-cyan-400/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/10"

  if (target && external) {
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className={commonClasses}
        aria-label={`เปิดโปรโมชั่น ${promo.title} บน Facebook`}
      >
        {cardInner}
      </a>
    )
  }
  if (target) {
    return (
      <Link href={target} className={commonClasses}>
        {cardInner}
      </Link>
    )
  }
  return <div className={commonClasses}>{cardInner}</div>
}
