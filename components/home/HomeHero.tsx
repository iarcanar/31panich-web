import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import StoreStatusChip from "@/components/home/StoreStatusChip"
import { LINE_URL } from "@/lib/store-config"

/**
 * Homepage hero (replaced the sci-fi banner 2026-05-29).
 * Real storefront photo + a smiling greeter cutout + welcome copy + phone/LINE CTAs.
 * Goal: feel like a real, approachable local shop (ช่าง/ชาวบ้าน) instead of sleek-but-cold sci-fi.
 *
 * Header interaction (Header is `sticky top-0`, ~56px):
 *  - mobile: `-mt-16` so the translucent glass header overlays the hero top;
 *    content uses `pt-[72px]` so it clears the header.
 *  - desktop (lg): header is solid → no negative margin; hero sits below it.
 * Storefront `object-[center_60%]` crops low so the shop front shows (not just sky/sign).
 */

const TRUST = [
  {
    icon: (
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
    ),
    text: "เปิดทุกวัน",
  },
  {
    icon: (
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
      </svg>
    ),
    text: "ศูนย์ผสมสี Beger · TOA",
  },
  {
    icon: (
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    text: "ราคาไม่แพง",
  },
]

export default function HomeHero() {
  return (
    <section className="relative w-full -mt-16 lg:mt-0 overflow-hidden bg-[#0e0e14]">
      {/* Storefront photo — real shop. object low so the building/products show */}
      <Image
        src="/store/front-store-2026.webp"
        alt="ร้านสามหนึ่งพานิช ลพบุรี — สี วัสดุก่อสร้าง เครื่องมือช่าง ศูนย์ผสมสี"
        fill
        priority
        className="object-cover object-[center_60%]"
        sizes="100vw"
      />

      {/* Gradients: top (header safe-zone) · left (text legibility) · bottom (ground the greeter) */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0e0e14] via-[#0e0e14]/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e14] via-[#0e0e14]/85 md:via-[#0e0e14]/65 to-[#0e0e14]/15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e14] via-[#0e0e14]/35 to-transparent pointer-events-none" />

      {/* AI dot grid — visible on dark left, dissolves into bright right */}
      <div
        aria-hidden
        className="animate-hero-dot absolute inset-0 z-[6] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(168,85,247,0.7) 1.1px, transparent 1.1px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "4px 9px",
          maskImage: "linear-gradient(90deg, black 0%, black 20%, rgba(0,0,0,0.5) 44%, transparent 66%)",
          WebkitMaskImage: "linear-gradient(90deg, black 0%, black 20%, rgba(0,0,0,0.5) 44%, transparent 66%)",
        }}
      />

      {/* Greeter cutout — foreground, stands at bottom-right; her gesture points toward the text */}
      <div className="pointer-events-none absolute right-0 bottom-5 z-10 w-[46%] sm:w-[40%] md:w-[34%] lg:w-[30%] max-w-[440px] aspect-[888/1000]">
        <Image
          src="/store/greeter-female.webp"
          alt="พนักงานต้อนรับร้านสามหนึ่งพานิช ยินดีให้คำปรึกษา"
          fill
          priority
          className="object-contain object-bottom drop-shadow-[0_12px_34px_rgba(0,0,0,0.6)]"
          sizes="(max-width: 768px) 46vw, 440px"
        />
      </div>

      {/* Content — left column, clears the greeter on the right; pt clears the mobile header */}
      <div className="relative z-20 container mx-auto px-5 md:px-4">
        <div className="flex flex-col justify-center min-h-[380px] sm:min-h-[400px] md:min-h-[460px] lg:min-h-[clamp(460px,40vw,560px)] pt-[72px] pb-8 md:pb-9 lg:py-16 max-w-[62%] sm:max-w-[58%] md:max-w-[54%] lg:max-w-[52%]">
          {/* store open/closed status chip */}
          <div className="mb-3">
            <StoreStatusChip />
          </div>

          <h1 className="sci-fi-title whitespace-nowrap text-[clamp(18px,5.5vw,30px)] md:text-5xl lg:text-6xl th-text">
            ร้านสามหนึ่งพานิช
          </h1>

          <div className="mt-3 max-w-md">
            <p className="text-purple-400 text-[16px] md:text-base lg:text-xl lg:whitespace-nowrap font-bold leading-snug th-text" style={{ textShadow: "0 0 12px rgba(168,85,247,0.55)" }}>
              <span className="whitespace-nowrap">สี</span> · <span className="whitespace-nowrap">วัสดุก่อสร้าง</span> · <span className="whitespace-nowrap">เครื่องมือช่าง</span> · <span className="whitespace-nowrap">ศูนย์ผสมสี</span> <span className="whitespace-nowrap">เบเยอร์-TOA</span>
            </p>
          </div>

          {/* chips + CTA hidden on mobile (contact handled by the bottom-right AI chat button, which has call + LINE) */}
          <div className="hidden md:flex flex-wrap gap-1.5 mt-3.5">
            {TRUST.map((t) => (
              <span
                key={t.text}
                className="inline-flex items-center gap-1 bg-white/10 border border-white/15 rounded-full px-2.5 py-1 text-[11px] text-white th-text backdrop-blur-sm"
              >
                <span aria-hidden>{t.icon}</span>
                {t.text}
              </span>
            ))}
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-2.5 mt-5">
            <ContactLink
              type="phone"
              openClassName=""
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-[#1f1500] text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-amber-500/30 transition"
              closedClassName="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-full"
              showHoursWhenClosed
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
              </svg>
              โทรปรึกษา
            </ContactLink>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b24c] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-[#06C755]/20 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2C6.48 2 2 5.73 2 10.2c0 4 3.58 7.36 8.4 7.93.33.07.78.22.89.5.1.25.07.65.03.91 0 0-.12.71-.14.86-.04.25-.2 1 .88.54 1.09-.45 5.84-3.43 7.97-5.88C21.46 13.4 22 11.86 22 10.2 22 5.73 17.52 2 12 2z" />
              </svg>
              แชทผ่านไลน์
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
