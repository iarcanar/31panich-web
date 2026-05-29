import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
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
  { icon: "⏰", text: "เปิดทุกวัน" },
  { icon: "🎨", text: "ศูนย์ผสมสี Beger · TOA" },
  { icon: "💰", text: "ราคาไม่แพง" },
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

      {/* Greeter cutout — foreground, stands at bottom-right; her gesture points toward the text */}
      <div className="pointer-events-none absolute right-0 bottom-0 z-10 w-[46%] sm:w-[40%] md:w-[34%] lg:w-[30%] max-w-[440px] aspect-[888/1000]">
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
        <div className="flex flex-col justify-center min-h-[470px] sm:min-h-[430px] lg:min-h-[clamp(460px,40vw,560px)] pt-[72px] pb-9 lg:py-16 max-w-[64%] sm:max-w-[58%] md:max-w-[54%] lg:max-w-[46%]">
          <span className="inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border bg-amber-500/15 text-amber-300 border-amber-500/40">
            ร้านของเรา
          </span>

          {/* lead-in (small) + shop name in the modern glow style from the old hero */}
          <p className="text-gray-100/90 font-medium text-[clamp(13px,3.6vw,16px)] md:text-lg mt-3 th-text">
            ยินดีต้อนรับสู่
          </p>
          <h1 className="sci-fi-title text-[clamp(25px,6.8vw,34px)] md:text-5xl lg:text-6xl mt-0.5 th-text">
            ร้านสามหนึ่งพานิช
          </h1>

          <p className="text-gray-200 text-[13px] md:text-base mt-2.5 md:mt-3 leading-relaxed th-text max-w-md">
            สี · วัสดุก่อสร้าง · เครื่องมือช่าง · ศูนย์ผสมสี — ที่ลพบุรี ปรึกษาเราได้เลย เหมือนมาเดินที่ร้าน
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3.5">
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

          <div className="flex flex-wrap items-center gap-2.5 mt-5">
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
