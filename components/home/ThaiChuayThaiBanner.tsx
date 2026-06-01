"use client"

import Image from "next/image"
import { useState } from "react"

/**
 * "ไทยช่วยไทย พลัส (60/40)" participation banner — sits right under HomeHero.
 *
 * Goal: tell customers the shop joined the government co-payment scheme, then let
 * them tap the banner to expand (in-place) a plain-language explainer + a live
 * calculator that shows, for any product price, how much the state pays (60%) vs
 * how much they pay (40%), plus the daily/monthly subsidy quota that remains.
 *
 * Scheme facts (confirmed via official site ไทยช่วยไทยพลัส.th + Thai gov / PRD):
 *  - State pays 60%, citizen pays 40% (co-payment).
 *  - State subsidy capped at ฿200/day and ฿1,000/month.
 *  - Total ฿4,000/person across 4 months (1 Jun – 30 Sep 2026).
 * No official logo/colour asset exists yet → banner is CSS-only (Thai tricolour
 * accents on the site's dark theme) so it renders without an image dependency.
 */

const OFFICIAL_URL = "https://www.xn--42caj4e1a2ame9b2cq0dyo.com/" // www.คนละครึ่งพลัส.com
const STATE_SHARE = 0.6 // รัฐช่วย 60%
const DAILY_STATE_CAP = 200 // เพดานรัฐช่วยต่อวัน (บาท)

// Official timeline (จากเว็บทางการ ไทยช่วยไทยพลัส.th) — ส่วนที่เกี่ยวกับผู้ใช้สิทธิ์
const TIMELINE = [
  { date: "1 มิ.ย. 69", title: "เริ่มใช้สิทธิ์วันแรก", detail: "ทุกวัน 06:00–23:00 น.", now: true },
  { date: "15 มิ.ย. 69", title: "ใช้ผ่านฟู้ดเดลิเวอรีได้", detail: "06:00–21:00 น." },
  { date: "30 ก.ย. 69", title: "วันสุดท้ายของโครงการ", detail: "ปิดรับสิทธิ์ 23:00 น." },
]

const baht = (n: number) =>
  n.toLocaleString("th-TH", { maximumFractionDigits: 0 })

export default function ThaiChuayThaiBanner() {
  const [open, setOpen] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [price, setPrice] = useState(300)

  // คำนวณชั้นเดียว: ใส่ราคา → รัฐช่วย 60% (เพดาน 200/วัน) → จ่ายเองส่วนที่เหลือ
  const idealState = price * STATE_SHARE
  const stateHelp = Math.max(0, Math.min(idealState, DAILY_STATE_CAP))
  const youPay = Math.max(0, price - stateHelp)
  const capped = stateHelp < idealState - 0.5 // รัฐช่วยชนเพดาน 200/วัน

  return (
    <section className="relative z-30 -mt-6 md:-mt-8 lg:-mt-10 pb-6 md:pb-9">
        {/* ── Full-bleed banner (clickable) — เต็มกว้างจอ + ทับ greeter เล็กน้อย ── */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group relative z-10 block w-full overflow-hidden text-left
                     border-t border-blue-200/50 bg-white
                     bg-gradient-to-br from-white via-[#eef4ff] to-[#f7faff]
                     shadow-2xl shadow-black/40 transition-shadow duration-300 hover:shadow-blue-900/50"
        >
          {/* Thai tricolour accent stripe (top) */}
          <div className="absolute inset-x-0 top-0 h-1.5 flex" aria-hidden>
            <div className="flex-1 bg-[#A51931]" />
            <div className="flex-[1.5] bg-white" />
            <div className="flex-[2] bg-[#2D2A4A]" />
            <div className="flex-[1.5] bg-white" />
            <div className="flex-1 bg-[#A51931]" />
          </div>

          {/* soft glow */}
          <div className="pointer-events-none absolute -right-8 -bottom-12 w-48 h-48 rounded-full bg-blue-300/20 blur-3xl" />

          <div className="relative container mx-auto max-w-6xl flex items-center gap-3 md:gap-5 px-4 md:px-6 py-3.5 md:py-5 pt-4 md:pt-6">
            {/* Official logo — มีชื่อโครงการ + 60/40 ในตัว (พื้นโปร่งใส) */}
            <div className="shrink-0 relative h-11 w-[124px] md:h-[66px] md:w-[187px]">
              <Image
                src="/ads/thai60-40-logo.webp"
                alt="โครงการไทยช่วยไทย พลัส 60/40"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 124px, 187px"
              />
            </div>

            {/* Copy */}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-[10px] md:text-[11px] font-bold th-text">
                  ร้านสามหนึ่งร่วมโครงการ
                </span>
              </div>
              <p className="text-[#16245c] font-extrabold text-[14px] md:text-lg leading-tight th-text">
                ซื้อของที่ร้าน รัฐช่วยจ่าย 60%
              </p>
              <p className="text-blue-900/55 text-[11px] md:text-sm th-text mt-0.5 line-clamp-1">
                แตะดูวิธีคิด + คำนวณสิทธิ์ที่ร้านได้เลย
              </p>
            </div>

            {/* Chevron */}
            <div
              className={`shrink-0 grid place-items-center w-8 h-8 rounded-full bg-blue-900/10 text-blue-900
                          transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              aria-hidden
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* ── Expandable panel — แถบขาว full-bleed ต่อเนื่องจากแบนเนอร์ (ไม่มีเส้นแบ่ง, ซ้อนหลัง banner) ── */}
        <div
          className={`relative grid transition-all duration-500 ease-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="bg-white">
              <div className="container mx-auto px-4 max-w-5xl py-4 md:py-5 space-y-4">
              {/* How it works — compact one-liner (ย่อให้ประหยัดพื้นที่) */}
              <p className="text-[12px] md:text-[13px] text-slate-600 th-text leading-relaxed">
                💡 ซื้อของที่ร้าน <b className="text-blue-700">รัฐช่วยจ่าย 60%</b> เราจ่ายเอง 40% ·
                รัฐช่วยสูงสุด <b className="text-slate-800">200฿/วัน</b> · <b className="text-slate-800">1,000฿/เดือน</b>{" "}
                (รวม 4,000฿) · ใช้ได้ 1 มิ.ย.–30 ก.ย. 69 ผ่านแอป <b className="text-slate-800">เป๋าตัง</b>
              </p>

              {/* Live calculator */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-slate-800 font-bold text-sm md:text-base th-text mb-3 flex items-center gap-2">
                  🧮 ลองคำนวณดู
                </h3>

                <label className="block text-slate-500 text-[13px] md:text-sm th-text mb-2">
                  ใส่ราคาสินค้าที่จะซื้อ
                </label>

                {/* Row: ช่องราคา (ย่อ) + ผลเรียลไทม์ รัฐช่วย / คุณออกเอง */}
                <div className="flex items-stretch gap-2.5">
                  {/* Price input — ย่อความกว้าง */}
                  <div className="relative w-[42%] shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl md:text-2xl font-bold pointer-events-none">
                      ฿
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={price === 0 ? "" : price}
                      onFocus={() => setPrice(0)}
                      onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="ราคา"
                      className="w-full h-full bg-white border-2 border-slate-200 rounded-xl pl-8 pr-2 py-3
                                 text-slate-900 text-2xl md:text-3xl font-extrabold th-text outline-none text-center
                                 placeholder:text-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30
                                 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Live result — รัฐช่วย (บน) / คุณออกเอง (ล่าง) */}
                  <div className="flex-1 grid grid-rows-2 gap-2">
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3">
                      <span className="text-emerald-700/80 text-[11px] md:text-[12px] th-text">💚 รัฐช่วย</span>
                      <span className="text-emerald-700 font-extrabold text-base md:text-lg">฿{baht(stateHelp)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-300 px-3">
                      <span className="text-amber-700/80 text-[11px] md:text-[12px] th-text">👛 คุณออกเอง</span>
                      <span className="text-amber-600 font-extrabold text-base md:text-lg">฿{baht(youPay)}</span>
                    </div>
                  </div>
                </div>

                {/* สรุป — เน้นคุณจ่ายเอง */}
                <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 text-center mt-4">
                  <div className="text-amber-700/80 text-[13px] md:text-sm th-text">👛 ครั้งนี้คุณจ่ายเอง</div>
                  <div className="text-amber-600 font-extrabold text-4xl md:text-5xl leading-none mt-0.5">
                    ฿{baht(youPay)}
                  </div>
                  <div className="text-emerald-600 text-[12px] md:text-[13px] th-text mt-2">
                    💚 รัฐช่วย <b className="text-emerald-700">฿{baht(stateHelp)}</b> จากราคาเต็ม{" "}
                    <b className="text-slate-700">฿{baht(price)}</b>
                  </div>
                  <div className={`text-[11px] md:text-[12px] th-text mt-1 ${capped ? "text-orange-600 font-semibold" : "text-slate-400"}`}>
                    ℹ️ รัฐช่วยสูงสุด ฿{baht(DAILY_STATE_CAP)}/วัน{capped ? " — ส่วนเกินจ่ายเอง" : ""}
                  </div>
                </div>

                {/* เงื่อนไขร่วมโปร */}
                <p className="text-[10px] md:text-[11px] text-slate-400 th-text mt-2 leading-snug">
                  *โครงการไทยช่วยไทยไม่สามารถใช้ร่วมกับการเก็บแต้มสามหนึ่ง
                </p>
              </div>

              {/* Timeline — minimizable (พับไว้ default) */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTimeline((v) => !v)}
                  aria-expanded={showTimeline}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-slate-800 font-bold text-sm th-text flex items-center gap-2">
                    📅 ระยะเวลาโครงการ
                  </span>
                  <span
                    className={`grid place-items-center w-6 h-6 rounded-full bg-slate-100 text-slate-600
                                transition-transform duration-300 ${showTimeline ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-400 ease-out ${
                    showTimeline ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden min-h-0">
                    <ol className="px-4 pb-4 space-y-3">
                      {TIMELINE.map((t) => (
                        <li key={t.date} className="flex gap-3">
                          <div className="shrink-0 flex flex-col items-center">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                t.now ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-slate-300"
                              }`}
                            />
                            <span className="w-px flex-1 bg-slate-200 mt-1" />
                          </div>
                          <div className="-mt-0.5 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-amber-600 font-bold text-[13px] th-text">{t.date}</span>
                              {t.now && (
                                <span className="text-[9px] font-bold th-text bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                  เริ่มแล้ววันนี้
                                </span>
                              )}
                            </div>
                            <div className="text-slate-800 text-[13px] th-text">{t.title}</div>
                            <div className="text-slate-500 text-[11px] th-text">{t.detail}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <a
                  href={OFFICIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500
                             text-white text-sm font-bold px-5 py-2.5 rounded-full transition th-text"
                >
                  เว็บทางการโครงการ
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                <p className="text-[11px] text-slate-400 th-text text-center sm:text-left leading-snug">
                  ตัวเลขเป็นการประมาณเพื่อความเข้าใจ<br className="hidden sm:block" /> ยึดเงื่อนไขจริงตามแอปเป๋าตัง
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
