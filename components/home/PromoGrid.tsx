import Image from "next/image"
import Link from "next/link"
import ContactLink from "@/components/ui/ContactLink"
import SectionHeading from "@/components/ui/SectionHeading"
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

  // Video embed layout: cyan glow border card
  if (promo.videoEmbed) {
    return (
      <div className="relative rounded-2xl shadow-xl shadow-cyan-500/15">
        {/* Glow border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/50 via-blue-500/30 to-cyan-400/50" />
        <div className="relative m-[2px] rounded-[14px] overflow-hidden bg-gradient-to-br from-[#0e1525] via-[#111827] to-[#0e1525]">
          {/* Badge — top right */}
          {promo.badge && (
            <span className="absolute top-3 right-3 z-10 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-cyan-500/40">
              {promo.badge}
            </span>
          )}

          {/* Watermark pattern — tools & hardware */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
            {/* Wrench */}
            <svg className="absolute -right-4 -bottom-4 w-56 h-56 text-cyan-300 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
            {/* Paintbrush */}
            <svg className="absolute right-1/4 -top-2 w-40 h-40 text-blue-300 -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M18.37 2.63a1 1 0 00-1.41 0L9 10.59l4.41 4.41 7.96-7.96a1 1 0 000-1.41l-3-3zM2 22l4-4 4.41 4.41" /><path d="M9 10.59L2 22l11.41-7.41" /></svg>
            {/* Bolt/screw */}
            <svg className="absolute left-1/3 bottom-4 w-32 h-32 text-cyan-200 rotate-[30deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            {/* Hammer */}
            <svg className="absolute right-12 top-1/3 w-28 h-28 text-blue-200 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9" /><path d="M17.64 15L22 10.64a1 1 0 000-1.41L18.77 6a5 5 0 00-6.2-.64L12 6l1 1 3.64 3.64" /></svg>
          </div>

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
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#111827]" />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center px-5 py-6 md:px-10 md:py-8 relative overflow-hidden">
              {/* Glow orbs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-blue-500/6 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300 text-xl md:text-2xl font-black mb-3 leading-tight">
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
      </div>
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
