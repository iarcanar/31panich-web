"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

/* ─────────────────────────────────────────────
 *  CONFIG — เปลี่ยนโปรโมชั่นแก้แค่ตรงนี้ที่เดียว
 *  1. วางภาพใน public/promotions/
 *  2. อัปเดต PROMO ด้านล่าง (width/height = ขนาดจริงของภาพ)
 *  3. แก้ content ใน CONTENT
 *  Done — ไม่ต้องแก้ JSX ด้านล่าง
 * ───────────────────────────────────────────── */

interface PromoPopupConfig {
  id: string
  image: string
  imageWidth: number   // ความกว้างจริงของภาพ (px)
  imageHeight: number  // ความสูงจริงของภาพ (px)
  alt: string
}

interface PromoContent {
  title: string
  body: string
  infoPrimary: string   // ข้อความด้านซ้าย (เช่น หยุด ...)
  infoSecondary: string // ข้อความด้านขวา (เช่น เปิด ...)
  footer: string
}

const PROMO: PromoPopupConfig = {
  id: "songkran-2569",
  image: "/promotions/songkran-2569-popup.webp",
  imageWidth: 800,
  imageHeight: 538,
  alt: "โปรโมชั่นสงกรานต์ 2569",
}

const CONTENT: PromoContent = {
  title: "🎉 สุขสันต์วันสงกรานต์ 🌊",
  body: "วันนี้ (11 เม.ย.) เปิดร้านวันสุดท้ายก่อนหยุดยาว\nหากต้องการสั่งของ แวะได้เลยก่อน 17.30 น.",
  infoPrimary: "🗓️ หยุด 12–16 เมษายน",
  infoSecondary: "✅ เปิด ศุกร์ 17 เม.ย.",
  footer: "ขอให้ทุกท่านเดินทางปลอดภัย ไปเล่นน้ำสนุกๆ กลับมาสุขภาพดีทุกคนนะคะ 🙏",
}

/* ─────────────────────────────────────────────
 *  COMPONENT — ไม่ต้องแก้ไข
 * ───────────────────────────────────────────── */

function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

export default function PromoPopup() {
  const [visible, setVisible] = useState(false)
  const [dontShowToday, setDontShowToday] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const today = todayBangkok()
    const stored = localStorage.getItem(`popup:${PROMO.id}`)
    if (stored === today) return

    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  function handleClose() {
    if (dontShowToday) {
      localStorage.setItem(`popup:${PROMO.id}`, todayBangkok())
    }
    setClosing(true)
    setTimeout(() => setVisible(false), 250)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div className={`fixed inset-0 z-[201] flex items-center justify-center p-4 transition-all duration-250 ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        <div className="relative w-full max-w-lg bg-[#12121c] border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden">

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
            aria-label="ปิด"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image — ปรับตาม ratio จริงอัตโนมัติ ไม่ crop */}
          <Image
            src={PROMO.image}
            alt={PROMO.alt}
            width={PROMO.imageWidth}
            height={PROMO.imageHeight}
            className="w-full h-auto"
            sizes="(max-width: 640px) 95vw, 512px"
            priority
          />

          {/* Text content */}
          <div className="px-5 py-4 space-y-3">
            <h2 className="text-center text-xl font-black text-white tracking-wide">
              {CONTENT.title}
            </h2>

            <div className="text-center text-sm text-gray-300 leading-relaxed space-y-2">
              <p>
                {CONTENT.body.split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>

              <div className="flex items-center justify-center gap-4 py-1">
                <span className="font-semibold text-red-400">{CONTENT.infoPrimary}</span>
                <div className="w-px h-5 bg-white/10" />
                <span className="font-semibold text-emerald-400">{CONTENT.infoSecondary}</span>
              </div>

              <p className="text-gray-400 text-xs">{CONTENT.footer}</p>
            </div>

            {/* Don't show today checkbox + close */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px] text-gray-500 group-hover:text-gray-400 transition-colors select-none">
                  ไม่ต้องแสดงอีกในวันนี้
                </span>
              </label>
              <button
                onClick={handleClose}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-400/10 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
