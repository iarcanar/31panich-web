import Image from "next/image"
import Link from "next/link"
import ContactLink from "@/components/ui/ContactLink"
import SectionHeading from "@/components/ui/SectionHeading"
import ScrollGlowFrame from "@/components/ui/ScrollGlowFrame"
import { PHONE } from "@/lib/store-config"
import type { Promotion } from "@/types/promotion"

interface Props {
  promotions: Promotion[]
}

export default function PromoGrid({ promotions }: Props) {
  if (promotions.length === 0) return null

  const hero = promotions[0]
  const rest = promotions.slice(1)

  return (
    <section className="bg-[#0e0e14] py-10 md:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeading accentColor="from-orange-400 to-red-500" className="mb-8 md:mb-10">โปรโมชั่นล่าสุด</SectionHeading>
        <div className="space-y-6 md:space-y-10">
          {/* Hero promo — full width */}
          <PromoCardHero promo={hero} />

          {/* Remaining promos */}
          {rest.length > 0 && (
            <div className={`grid gap-3 md:gap-6 ${rest.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {rest.map((p) => (
                <PromoCardSmall key={p.id} promo={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PromoCardHero({ promo }: { promo: Promotion }) {
  const Wrapper = promo.link ? Link : "div"
  const wrapperProps = promo.link ? { href: promo.link } : {}

  // Video embed layout: ScrollGlowFrame + vibrant card
  if (promo.videoEmbed) {
    return (
      <ScrollGlowFrame offsetTop={-20} color={[255, 140, 50]} glowIntensity={1.8} glowSpread={100} glowAnchor={30}>
        <div className="relative rounded-b-2xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#1a1a28]">
          {/* Badge */}
          {promo.badge && (
            <span className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-red-500/40">
              {promo.badge}
            </span>
          )}

          <div className="flex flex-col md:flex-row">
            {/* Video */}
            <div className="flex justify-center bg-black/50 md:w-[300px] shrink-0 relative">
              <iframe
                src={promo.videoEmbed}
                width={267}
                height={476}
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder={0}
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#16162a]" />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center px-5 py-6 md:px-10 md:py-8 relative overflow-hidden">
              {/* Glow orbs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-amber-500/6 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 text-xl md:text-2xl font-black mb-3 leading-tight">
                  {promo.title}
                </p>
                {promo.subtitle && (
                  <p className="text-white/60 text-xs md:text-sm mb-5 leading-relaxed max-w-md">
                    {promo.subtitle}
                  </p>
                )}

                {/* URL highlight */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 mb-5">
                  <span className="text-cyan-400 text-xs md:text-sm font-bold tracking-wide">WWW.31PANICH.CO.TH</span>
                </div>

                <PromoCTAs promo={promo} />
              </div>
            </div>
          </div>
        </div>
      </ScrollGlowFrame>
    )
  }

  return (
    <Wrapper {...wrapperProps as any} className="relative block rounded-2xl overflow-hidden bg-[#1a1a28] border border-white/10 shadow-lg group">
      <Image
        src={promo.image}
        alt={promo.title}
        width={1200}
        height={670}
        className="w-full h-auto"
        priority
      />
      {promo.badge && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-md shadow-lg">
          {promo.badge}
        </span>
      )}
      <div className="px-5 py-4 md:px-8 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-white text-sm font-medium">{promo.title}</p>
          {promo.subtitle && <p className="text-white/50 text-xs mt-0.5">{promo.subtitle}</p>}
        </div>
        <PromoCTAs promo={promo} />
      </div>
    </Wrapper>
  )
}

function PromoCardSmall({ promo }: { promo: Promotion }) {
  const Wrapper = promo.link ? Link : "div"
  const wrapperProps = promo.link ? { href: promo.link } : {}

  return (
    <Wrapper {...wrapperProps as any} className="bg-[#1a1a28] rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-400/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 group">
      <div className="aspect-square bg-[#252540] relative overflow-hidden">
        <Image
          src={promo.image}
          alt={promo.title}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {promo.badge && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md shadow">
            {promo.badge}
          </span>
        )}
      </div>
      <div className="p-3 md:p-4">
        <h4 className="text-white text-xs md:text-sm font-bold leading-snug line-clamp-2">{promo.title}</h4>
        {promo.subtitle && <p className="text-white/40 text-[10px] md:text-xs mt-1">{promo.subtitle}</p>}
        <PromoCTAs promo={promo} size="sm" />
      </div>
    </Wrapper>
  )
}

function PromoCTAs({ promo, size = "md" }: { promo: Promotion; size?: "sm" | "md" }) {
  const hasCTA = promo.ctaFacebook || promo.ctaLine || promo.ctaPhone
  if (!hasCTA) return null

  const cls = size === "sm"
    ? "flex flex-wrap gap-1.5 mt-2"
    : "flex flex-wrap items-center gap-2 md:gap-3"
  const btnCls = size === "sm"
    ? "bg-white/10 text-white font-bold px-3 py-1 rounded-full text-[10px] hover:bg-white/20 transition"
    : "bg-white/10 text-white font-bold px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm hover:bg-white/20 transition"

  return (
    <div className={cls}>
      {promo.ctaFacebook && (
        <a href={promo.ctaFacebook} target="_blank" rel="noopener noreferrer" className={`${btnCls} !bg-[#1877F2] hover:!bg-[#166FE5]`}>
          Facebook
        </a>
      )}
      {promo.ctaLine && (
        <ContactLink type="line" className={btnCls}>LINE</ContactLink>
      )}
      {promo.ctaPhone && (
        <ContactLink type="phone" className={btnCls}>{PHONE}</ContactLink>
      )}
    </div>
  )
}
