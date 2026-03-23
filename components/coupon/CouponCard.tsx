"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type { Coupon } from "@/lib/coupons"
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
// เส้นโค้ง 8 เส้นถี่เสมอกัน ไล่ opacity gradient จากบนลงล่าง 0.12→0.06
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
export default function CouponCard({ coupon }: { coupon: Coupon }) {
  const [claimed, setClaimed] = useState(false)
  const [claimInfo, setClaimInfo] = useState<ClaimedInfo | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const accent = ACCENT[coupon.discountType] || ACCENT.percent

  useEffect(() => {
    const info = getClaimedInfo(coupon.id)
    if (info) {
      setClaimed(true)
      setClaimInfo(info)
    }
  }, [coupon.id])

  // ซ่อน card ที่รับแล้ว
  if (claimed && !showModal) return null

  async function handleClaim() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "ไม่สามารถรับคูปองได้")
        return
      }
      const info: ClaimedInfo = { serial: data.serial, claimedAt: data.claimedAt }
      markClaimed(coupon.id, info)
      setClaimed(true)
      setClaimInfo(info)
      setShowModal(true)
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
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
        className={`relative bg-[#1a1a28] border border-dashed rounded-xl overflow-hidden
          ${accent.border} transition-all hover:border-white/25`}
        style={guillocheStyle}
      >
        {/* Accent stripe left */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bg}`} />

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

        <div className="relative pl-5 pr-4 py-4">
          {/* Top: discount badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`inline-block text-lg md:text-xl font-bold ${accent.text}`}>
              {discountLabel(coupon)}
            </span>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${accent.badge}`}>
              {coupon.discountType === "percent" ? "%" : coupon.discountType === "fixed" ? "฿" : "🎁"}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm md:text-base font-medium text-white/90 mb-1 line-clamp-2">
            {coupon.title}
          </h3>

          {/* Conditions */}
          {coupon.minPurchase > 0 && (
            <p className="text-xs text-white/50 mb-0.5">ซื้อขั้นต่ำ {coupon.minPurchase.toLocaleString()} บาท</p>
          )}
          {coupon.category && (
            <p className="text-xs text-white/50 mb-0.5">หมวด: {coupon.category}</p>
          )}
          {coupon.stackWithPoints ? (
            <p className="text-xs text-amber-400/80 mb-0.5">✦ ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้</p>
          ) : (
            <p className="text-xs text-white/35 mb-0.5">ไม่สามารถใช้ร่วมกับโปรรับแต้มสามหนึ่ง</p>
          )}

          {/* Footer: expiry + CTA */}
          <div className="flex items-center justify-between mt-3 gap-2">
            <span className="text-[11px] text-white/40">
              หมดเขต {formatDate(coupon.endDate)}
            </span>
            <button
              onClick={handleClaim}
              disabled={loading}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all
                ${accent.bg} hover:brightness-110 active:scale-95 disabled:opacity-50`}
            >
              {loading ? "กำลังรับ..." : "รับคูปอง"}
            </button>
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
