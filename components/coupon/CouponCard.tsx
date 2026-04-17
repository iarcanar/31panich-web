"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type { Coupon } from "@/lib/coupons"
import { getCouponStatus } from "@/lib/coupon-status"
import CouponClaimModal from "./CouponClaimModal"

// ─── localStorage helpers ──────────────────────────────
const STORAGE_KEY = "claimed_coupons"

interface ClaimedInfo {
  serial: string
  claimedAt: string
}

function getClaimedMap(): Record<string, ClaimedInfo> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function markClaimed(id: string, info: ClaimedInfo) {
  const map = getClaimedMap()
  map[id] = info
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function isClaimed(id: string): boolean {
  return id in getClaimedMap()
}

export function getClaimedInfo(id: string): ClaimedInfo | null {
  return getClaimedMap()[id] ?? null
}

// ─── Accent colors by discount type ────────────────────
const ACCENT: Record<string, { border: string; bg: string; text: string; badge: string; waveColor: string }> = {
  percent: { border: "border-orange-500/30", bg: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-300", waveColor: "251,146,60" },
  fixed:   { border: "border-emerald-500/30", bg: "bg-emerald-500", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300", waveColor: "52,211,153" },
  gift:    { border: "border-violet-500/30", bg: "bg-violet-500", text: "text-violet-400", badge: "bg-violet-500/20 text-violet-300", waveColor: "167,139,250" },
}

// SVG wave pattern for banknote-style guilloche watermark
function wavePatternUrl(rgb: string): string {
  const lines = 8
  const h = 56
  const gap = h / lines
  const amp = gap * 0.6
  const paths: string[] = []
  for (let i = 0; i < lines; i++) {
    const y = gap * 0.5 + i * gap
    const cy = y - amp
    const op = (0.12 - (i / (lines - 1)) * 0.06).toFixed(3)
    paths.push(`<path d='M0 ${y} Q25 ${cy}, 50 ${y} T100 ${y} T150 ${y} T200 ${y}' fill='none' stroke='rgba(${rgb},${op})' stroke-width='0.7'/>`)
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='${h}' viewBox='0 0 200 ${h}'>${paths.join("")}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function discountLabel(c: Coupon): string {
  if (c.discountType === "percent") return `ลด ${c.discountValue}%`
  if (c.discountType === "fixed") return `ลด ${c.discountValue} บาท`
  return c.giftDescription || "ของแถมฟรี"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
}

// ─── Component ─────────────────────────────────────────
const ERROR_MSG: Record<string, string> = {
  upcoming: "ยังไม่ถึงวันรับคูปอง",
  expired: "คูปองหมดอายุแล้ว",
  sold_out: "คูปองหมดแล้ว!",
  hidden: "คูปองไม่พร้อมใช้งาน",
  not_found: "ไม่พบคูปองนี้",
}

export default function CouponCard({ coupon }: { coupon: Coupon }) {
  const [claimed, setClaimed] = useState(false)
  const [claimInfo, setClaimInfo] = useState<ClaimedInfo | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [liveClaimCount, setLiveClaimCount] = useState(coupon.claimCount ?? 0)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState("")

  const accent = ACCENT[coupon.discountType] || ACCENT.percent

  // คำนวณสถานะจาก live data
  const status = getCouponStatus({ ...coupon, claimCount: liveClaimCount })
  const upcoming = status === "upcoming"
  const expired = status === "expired"
  const soldOut = status === "sold_out"

  useEffect(() => {
    if (upcoming || expired) return // ยังไม่ถึงวันรับ หรือหมดอายุ ไม่ต้อง fetch/check localStorage
    const info = getClaimedInfo(coupon.id)
    if (info) {
      setClaimed(true)
      setClaimInfo(info)
    }

    // Fetch real-time claimCount from server
    fetch(`/api/coupons/claim-count?id=${coupon.id}`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.count === "number") setLiveClaimCount(data.count) })
      .catch(() => {})
  }, [coupon.id, upcoming, expired])

  // รับไปแล้ว (ในเครื่องนี้) และไม่อนุญาตรับซ้ำ
  const alreadyClaimed = claimed && !coupon.allowRepeatClaim
  // สถานะ disabled (แสดงแต่กดไม่ได้)
  const disabled = status !== "active" || alreadyClaimed || claiming

  async function handleClaim() {
    if (disabled) return
    setClaiming(true)
    setClaimError("")

    try {
      // ① เรียก API ก่อน — server ตรวจ status + limit + สร้าง serial จริง
      const res = await fetch("/api/coupons/claim-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Server ปฏิเสธ — แปลง reason → ข้อความไทย
        const reason = data.error as string
        setClaimError(ERROR_MSG[reason] || "เกิดข้อผิดพลาด ลองอีกครั้ง")
        if (typeof data.count === "number") setLiveClaimCount(data.count)
        return
      }

      // ② สำเร็จ — ใช้ serial จาก server
      const serial = data.serial || `31-${coupon.serialPrefix || "A"}${data.count}`
      const claimedAt = new Date().toISOString()
      const info: ClaimedInfo = { serial, claimedAt }

      // ③ บันทึก localStorage + เปิด Modal
      markClaimed(coupon.id, info)
      setClaimed(true)
      setClaimInfo(info)
      setShowModal(true)
      if (typeof data.count === "number") setLiveClaimCount(data.count)
    } catch {
      setClaimError("ไม่สามารถเชื่อมต่อได้ ลองอีกครั้ง")
    } finally {
      setClaiming(false)
    }
  }

  // Banknote-style wave guilloche
  const guillocheStyle = {
    backgroundImage: wavePatternUrl(accent.waveColor),
    backgroundRepeat: "repeat",
    backgroundSize: "200px 56px",
  }

  return (
    <>
      <div
        className={`relative h-full bg-[#1a1a28] border border-dashed rounded-xl overflow-hidden
          ${accent.border} transition-all
          ${upcoming || expired ? "opacity-45 pointer-events-none select-none" : disabled && !claiming ? "opacity-50" : "hover:border-white/25"}`}
        style={guillocheStyle}
      >
        {/* Upcoming overlay badge */}
        {upcoming && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="text-white/80 text-sm font-semibold -rotate-12 border border-white/30 px-4 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm tracking-wide">
              🕐 รับได้ {formatDate(coupon.startDate)}
            </span>
          </div>
        )}

        {/* Expired overlay badge */}
        {expired && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="text-white/60 text-sm font-semibold -rotate-12 border border-white/20 px-4 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm tracking-wide">
              ⏱️ หมดอายุ
            </span>
          </div>
        )}

        {/* Disabled overlay (sold out / already claimed) */}
        {!upcoming && !expired && (soldOut || alreadyClaimed) && !claiming && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="text-red-500 text-2xl font-bold -rotate-12 border-2 border-red-500/60 px-4 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
              {soldOut ? "หมดแล้ว" : "รับไปแล้ว"}
            </span>
          </div>
        )}

        {/* Watermark 31 logo */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[100px] h-[100px] opacity-[0.04] pointer-events-none select-none">
          <Image
            src="/31-logo.svg"
            alt=""
            fill
            className="object-contain"
            aria-hidden="true"
          />
        </div>

        <div className="flex h-full">
          {/* Left: coupon image with dissolve effect */}
          {coupon.image && (
            <div className="relative w-24 sm:w-28 shrink-0 self-stretch">
              <Image
                src={coupon.image}
                alt=""
                fill
                className="object-cover"
                sizes="112px"
              />
              {/* Dissolve: clear top → dark bottom */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(26,26,40,0.5) 60%, rgba(26,26,40,0.95) 100%)" }}
              />
              {/* Accent stripe (left edge) */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bg}`} />
            </div>
          )}

          {/* Accent stripe when no image */}
          {!coupon.image && (
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bg}`} />
          )}

          <div className={`relative flex-1 min-w-0 pr-3 py-3 ${coupon.image ? "pl-2.5" : "pl-4"}`}>
            {/* Top: discount badge */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className={`inline-block text-base md:text-lg font-bold th-text ${accent.text}`}>
                {discountLabel(coupon)}
              </span>
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${accent.badge}`}>
                {coupon.discountType === "percent" ? "%" : coupon.discountType === "fixed" ? "฿" : "🎁"}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-medium text-white/90 mb-1 line-clamp-2 th-text">
              {coupon.title}
            </h3>

            {/* Conditions */}
            {coupon.minPurchase > 0 && (
              <p className="text-[11px] text-white/50 mb-0.5 th-text">ซื้อขั้นต่ำ {coupon.minPurchase.toLocaleString()} บาท</p>
            )}
            {coupon.category && (
              <p className="text-[11px] text-white/50 mb-0.5 th-text">หมวด: {coupon.category}</p>
            )}
            {coupon.stackWithPoints ? (
              <p className="text-[11px] text-amber-400/80 mb-0.5 th-text line-clamp-2">✦ ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้</p>
            ) : (
              <p className="text-[11px] text-white/35 mb-0.5 th-text line-clamp-2">ไม่สามารถใช้ร่วมกับโปรรับแต้มสามหนึ่ง</p>
            )}

            {/* Error message */}
            {claimError && (
              <p className="text-[11px] text-red-400 mt-1 mb-0.5 th-text">{claimError}</p>
            )}

            {/* Footer: expiry + CTA */}
            <div className="flex items-center justify-between mt-2.5 gap-2">
              <span className="text-[10px] text-white/40 whitespace-nowrap">
                {upcoming ? `เริ่ม ${formatDate(coupon.startDate)}` : `หมดเขต ${formatDate(coupon.endDate)}`}
              </span>
              {!upcoming && !expired && (
                <button
                  onClick={handleClaim}
                  disabled={disabled}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap transition-all
                    ${disabled ? "bg-gray-600 cursor-not-allowed opacity-50" : `${accent.bg} hover:brightness-110 active:scale-95`}`}
                >
                  {claiming ? "กำลังรับ..." : disabled ? (soldOut ? "หมดแล้ว" : "รับแล้ว") : claimed && coupon.allowRepeatClaim ? "รับอีกครั้ง" : "รับคูปอง"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {showModal && claimInfo && (
        <CouponClaimModal
          coupon={coupon}
          serial={claimInfo.serial}
          claimedAt={claimInfo.claimedAt}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
