"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import JsBarcode from "jsbarcode"
import type { Coupon } from "@/lib/coupons"

interface Props {
  coupon: Coupon
  serial: string
  claimedAt: string
  onClose: () => void
}

const ACCENT: Record<string, { bg: string; text: string; stripe: string; waveColor: string; rgb: string }> = {
  percent: { bg: "bg-orange-500/10", text: "text-orange-400", stripe: "bg-orange-500", waveColor: "251,146,60", rgb: "rgb(251,146,60)" },
  fixed:   { bg: "bg-emerald-500/10", text: "text-emerald-400", stripe: "bg-emerald-500", waveColor: "52,211,153", rgb: "rgb(52,211,153)" },
  gift:    { bg: "bg-violet-500/10", text: "text-violet-400", stripe: "bg-violet-500", waveColor: "167,139,250", rgb: "rgb(167,139,250)" },
}

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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("th-TH", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function CouponClaimModal({ coupon, serial, claimedAt, onClose }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const accent = ACCENT[coupon.discountType] || ACCENT.percent

  // Render barcode
  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, coupon.code, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: false,
        background: "transparent",
        lineColor: "#e2e8f0",
        margin: 0,
      })
    }
  }, [coupon.code])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  async function handleShare() {
    const shareData = {
      title: `คูปอง ${coupon.title} — สามหนึ่งพานิช`,
      text: `🎟️ ${discountLabel(coupon)}\n${coupon.title}\nรหัส: ${coupon.code}\nSerial: ${serial}\nใช้ได้ถึง ${formatDate(coupon.endDate)}\n\n31panich.com/promotions`,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* cancelled */ }
    } else {
      // Desktop fallback: open LINE share
      const text = encodeURIComponent(shareData.text!)
      window.open(`https://social-plugins.line.me/lineit/share?text=${text}`, "_blank")
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement("textarea")
      ta.value = coupon.code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveImage = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const W = 800, pad = 48
      const accentColor = accent.rgb
      const bg = "#13131d"
      const textMain = "#e2e8f0"
      const textSub = "rgba(255,255,255,0.5)"
      const textDim = "rgba(255,255,255,0.3)"
      const borderColor = "rgba(255,255,255,0.08)"

      // Build conditions list
      const conditions: string[] = []
      if (coupon.description) conditions.push(coupon.description)
      if (coupon.minPurchase > 0) conditions.push(`ซื้อขั้นต่ำ ${coupon.minPurchase.toLocaleString()} บาท`)
      if (coupon.category) conditions.push(`หมวด: ${coupon.category}`)
      conditions.push(`ใช้ได้ถึง ${formatDate(coupon.endDate)}`)
      if (coupon.stackWithPoints) {
        conditions.push("✦ ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้")
      } else {
        conditions.push("ไม่สามารถใช้ร่วมกับโปรรับแต้มสามหนึ่ง")
      }

      // Generate barcode on a hidden canvas
      const barcodeCanvas = document.createElement("canvas")
      JsBarcode(barcodeCanvas, coupon.code, {
        format: "CODE128", width: 3, height: 80,
        displayValue: false, background: "transparent", lineColor: textMain, margin: 0,
      })

      // Calculate total height
      const headerH = 120
      const serialH = 70
      const barcodeSection = 130
      const condH = conditions.length * 28 + 20
      const footerH = 60
      const H = pad + headerH + serialH + barcodeSection + condH + footerH + pad

      const canvas = document.createElement("canvas")
      canvas.width = W * 2
      canvas.height = H * 2
      const ctx = canvas.getContext("2d")!
      ctx.scale(2, 2)

      // Background
      ctx.fillStyle = bg
      ctx.roundRect(0, 0, W, H, 20)
      ctx.fill()

      // Border
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1.5
      ctx.roundRect(0, 0, W, H, 20)
      ctx.stroke()

      let y = pad

      // ── Header: discount label + title ──
      ctx.fillStyle = accentColor
      ctx.font = "bold 40px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(discountLabel(coupon), W / 2, y + 45)
      ctx.fillStyle = textMain
      ctx.font = "500 22px sans-serif"
      ctx.fillText(coupon.title, W / 2, y + 85)
      y += headerH

      // Divider
      ctx.strokeStyle = borderColor
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke()

      // ── Serial + timestamp ──
      ctx.fillStyle = textDim
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("SERIAL", W / 2 - 80, y + 22)
      ctx.fillText("รับเมื่อ", W / 2 + 80, y + 22)
      ctx.fillStyle = textMain
      ctx.font = "bold 16px monospace"
      ctx.fillText(serial, W / 2 - 80, y + 46)
      ctx.fillStyle = textSub
      ctx.font = "13px sans-serif"
      ctx.fillText(formatDateTime(claimedAt), W / 2 + 80, y + 46)
      y += serialH

      // Divider
      ctx.strokeStyle = borderColor
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke()

      // ── Barcode ──
      const bw = Math.min(barcodeCanvas.width / 2, W - pad * 4)
      const bh = (bw / barcodeCanvas.width) * barcodeCanvas.height
      ctx.drawImage(barcodeCanvas, (W - bw) / 2, y + 20, bw, bh)
      ctx.fillStyle = textMain
      ctx.font = "bold 20px monospace"
      ctx.textAlign = "center"
      ctx.fillText(coupon.code, W / 2, y + 20 + bh + 28)
      y += barcodeSection

      // ── Conditions ──
      ctx.textAlign = "left"
      ctx.font = "14px sans-serif"
      for (const cond of conditions) {
        const isSpecial = cond.startsWith("✦")
        ctx.fillStyle = isSpecial ? "rgba(251,191,36,0.8)" : textSub
        const bullet = isSpecial ? "" : "●  "
        ctx.fillText(bullet + cond, pad + 10, y + 20)
        y += 28
      }
      y += 20

      // ── Footer: branding ──
      ctx.fillStyle = textDim
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("สามหนึ่งพานิช — 31panich.com", W / 2, y + 20)

      // Export to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", 0.92)
      })

      const fileName = `coupon-${coupon.code}.jpg`

      // Mobile: use share API with file (saves to gallery on iOS/Android)
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        const file = new File([blob], fileName, { type: "image/jpeg" })
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `คูปอง ${coupon.code}` })
          } catch { /* user cancelled */ }
        } else {
          // Fallback: download
          downloadBlob(blob, fileName)
        }
      } else {
        // Desktop: trigger download
        downloadBlob(blob, fileName)
      }
    } catch (err) {
      console.error("Save image error:", err)
      alert("ไม่สามารถบันทึกภาพได้ กรุณา screenshot หน้าจอแทน")
    } finally {
      setSaving(false)
    }
  }, [coupon, serial, claimedAt, accent, saving])

  // Banknote-style wave guilloche
  const guillocheStyle = {
    backgroundImage: wavePatternUrl(accent.waveColor),
    backgroundRepeat: "repeat",
    backgroundSize: "200px 56px",
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-auto bg-[#13131d] md:rounded-2xl rounded-t-2xl
          border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
        style={guillocheStyle}
      >
        {/* Watermark 31 logo — center background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="relative w-[200px] h-[200px] opacity-[0.03]">
            <Image src="/31-logo.svg" alt="" fill className="object-contain" aria-hidden="true" />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
            text-white/60 hover:text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Coupon header */}
        <div className={`relative ${accent.bg} px-6 pt-8 pb-5 text-center border-b border-white/5`}>
          <div className={`inline-block text-2xl md:text-3xl font-bold ${accent.text} mb-1`}>
            {discountLabel(coupon)}
          </div>
          <h2 className="text-base md:text-lg font-medium text-white/90">{coupon.title}</h2>
        </div>

        {/* Serial + timestamp */}
        <div className="relative flex items-center justify-center gap-4 px-6 py-3 bg-white/[0.03] border-b border-white/5">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Serial</div>
            <div className="text-sm font-mono font-bold text-white/90">{serial}</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">รับเมื่อ</div>
            <div className="text-xs text-white/70">{formatDateTime(claimedAt)}</div>
          </div>
        </div>

        {/* Barcode */}
        <div className="relative px-6 py-5 flex flex-col items-center">
          <svg ref={barcodeRef} className="w-full max-w-[240px]" />
          <div className="mt-2 text-base font-mono font-bold text-white/80 tracking-[0.2em]">
            {coupon.code}
          </div>
        </div>

        {/* Conditions */}
        <div className="relative px-6 pb-4 space-y-1.5">
          {coupon.description && (
            <p className="text-xs text-white/50 flex items-start gap-1.5">
              <span className="text-white/30 mt-px">●</span> {coupon.description}
            </p>
          )}
          {coupon.minPurchase > 0 && (
            <p className="text-xs text-white/50 flex items-start gap-1.5">
              <span className="text-white/30 mt-px">●</span> ซื้อขั้นต่ำ {coupon.minPurchase.toLocaleString()} บาท
            </p>
          )}
          {coupon.category && (
            <p className="text-xs text-white/50 flex items-start gap-1.5">
              <span className="text-white/30 mt-px">●</span> หมวด: {coupon.category}
            </p>
          )}
          <p className="text-xs text-white/50 flex items-start gap-1.5">
            <span className="text-white/30 mt-px">●</span> ใช้ได้ถึง {formatDate(coupon.endDate)}
          </p>
          {coupon.stackWithPoints ? (
            <p className="text-xs text-amber-400/80 flex items-start gap-1.5">
              <span className="mt-px">✦</span> ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้
            </p>
          ) : (
            <p className="text-xs text-white/40 flex items-start gap-1.5">
              <span className="text-white/30 mt-px">●</span> ไม่สามารถใช้ร่วมกับโปรรับแต้มสามหนึ่ง
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative px-6 pb-4 space-y-2.5">
          <button
            onClick={handleSaveImage}
            disabled={saving}
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all
              ${accent.stripe} hover:brightness-110 active:scale-[0.98] disabled:opacity-60`}
          >
            {saving ? "กำลังบันทึก..." : "💾 บันทึกภาพคูปอง"}
          </button>
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white/80 bg-white/10
              hover:bg-white/15 active:scale-[0.98] transition-all"
          >
            📤 แชร์คูปอง
          </button>
          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white/80 bg-white/10
              hover:bg-white/15 active:scale-[0.98] transition-all"
          >
            {copied ? "✅ คัดลอกแล้ว!" : "📋 คัดลอกรหัส"}
          </button>
        </div>

        {/* Hint */}
        <div className="relative px-6 pb-6 text-center">
          <p className="text-[11px] text-white/30">
            💡 กดบันทึกภาพเพื่อเซฟลงมือถือ หรือ screenshot หน้าจอนี้
          </p>
        </div>
      </div>
    </div>
  )
}
