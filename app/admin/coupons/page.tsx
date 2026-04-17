"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { CATEGORIES } from "@/lib/categories"
import type { Coupon } from "@/lib/coupons"
import { useAuth } from "../layout"
import ImageCropPicker from "@/components/admin/ImageCropPicker"
import CouponClaimModal from "@/components/coupon/CouponClaimModal"
import {
  SectionHeader,
  FieldLabel,
  TextInput,
  Toggle,
  Barcode,
} from "@/components/admin/ui"

// ─── Constants ───────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  code: "",
  description: "",
  image: "",
  discountType: "percent" as "percent" | "fixed" | "gift",
  discountValue: "",
  giftDescription: "",
  category: "",
  minPurchase: "0",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  isActive: false,
  testMode: true,
  usageLimit: "0",
  stackWithPoints: true,
  allowRepeatClaim: false,
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  percent: { label: "% ลด", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  fixed: { label: "฿ ลด", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  gift: { label: "ของแถม", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
}

// ─── Accent colors matching frontend CouponCard ─────────
const CARD_ACCENT: Record<string, { border: string; bg: string; text: string; badge: string; waveColor: string }> = {
  percent: { border: "border-orange-500/30", bg: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-300", waveColor: "251,146,60" },
  fixed:   { border: "border-emerald-500/30", bg: "bg-emerald-500", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300", waveColor: "52,211,153" },
  gift:    { border: "border-violet-500/30", bg: "bg-violet-500", text: "text-violet-400", badge: "bg-violet-500/20 text-violet-300", waveColor: "167,139,250" },
}

function cardWavePattern(rgb: string): string {
  const lines = 8, h = 56, gap = h / lines, amp = gap * 0.6
  const paths: string[] = []
  for (let i = 0; i < lines; i++) {
    const y = gap * 0.5 + i * gap, cy = y - amp
    const op = (0.12 - (i / (lines - 1)) * 0.06).toFixed(3)
    paths.push(`<path d='M0 ${y} Q25 ${cy}, 50 ${y} T100 ${y} T150 ${y} T200 ${y}' fill='none' stroke='rgba(${rgb},${op})' stroke-width='0.7'/>`)
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='${h}' viewBox='0 0 200 ${h}'>${paths.join("")}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function cardDiscountLabel(c: Coupon): string {
  if (c.discountType === "percent") return `ลด ${c.discountValue}%`
  if (c.discountType === "fixed") return `ลด ${c.discountValue} บาท`
  return c.giftDescription || "ของแถมฟรี"
}

function cardFormatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
}

// ─── Frontend-style preview (matches what customer sees on coupon page) ─
function CouponPreviewCard({ coupon: c }: { coupon: Coupon }) {
  const accent = CARD_ACCENT[c.discountType] || CARD_ACCENT.percent
  const guillocheStyle = {
    backgroundImage: cardWavePattern(accent.waveColor),
    backgroundRepeat: "repeat",
    backgroundSize: "200px 56px",
  }

  return (
    <div
      className={`relative bg-[#1a1a28] border border-dashed rounded-xl overflow-hidden ${accent.border}`}
      style={guillocheStyle}
    >
      <div className="flex">
        {/* Left: coupon image with dissolve */}
        {c.image && (
          <div className="relative w-20 shrink-0 self-stretch min-h-[100px]">
            <Image src={c.image} alt="" fill className="object-cover" sizes="80px" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(26,26,40,0.5) 60%, rgba(26,26,40,0.95) 100%)" }}
            />
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bg}`} />
          </div>
        )}

        {/* Accent stripe when no image */}
        {!c.image && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bg}`} />}

        <div className={`relative flex-1 pr-3 py-3 ${c.image ? "pl-2" : "pl-4"}`}>
          {/* Discount badge */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className={`text-sm font-bold ${accent.text}`}>{cardDiscountLabel(c)}</span>
            <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${accent.badge}`}>
              {c.discountType === "percent" ? "%" : c.discountType === "fixed" ? "฿" : "🎁"}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[11px] font-medium text-white/90 mb-1 line-clamp-2">{c.title}</h3>

          {/* Conditions */}
          {c.minPurchase > 0 && (
            <p className="text-[9px] text-white/50 mb-0.5">ซื้อขั้นต่ำ {c.minPurchase.toLocaleString()} บาท</p>
          )}
          {c.stackWithPoints ? (
            <p className="text-[9px] text-amber-400/80">✦ ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้</p>
          ) : (
            <p className="text-[9px] text-white/35">ไม่สามารถใช้ร่วมกับโปรรับแต้มสามหนึ่ง</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 gap-1">
            <span className="text-[9px] text-white/40">หมดเขต {cardFormatDate(c.endDate)}</span>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white ${accent.bg}`}>รับคูปอง</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Coupon Row with preview + inline verify ────────────

function CouponRow({ coupon: c, isAdmin, onEdit, onDelete, onToggle, onToggleTest, onShowClaims }: {
  coupon: Coupon; isAdmin: boolean
  onEdit: () => void; onDelete: () => void; onToggle: () => void; onToggleTest: () => void
  onShowClaims: () => void
}) {
  const [testClaim, setTestClaim] = useState(false)
  const typeInfo = TYPE_LABELS[c.discountType]
  const now = new Date().toISOString()
  const expired = c.endDate < now
  const notStarted = c.startDate > now
  const limitReached = c.usageLimit > 0 && c.usageCount >= c.usageLimit

  return (
    <div className={`bg-[#13131d] border rounded-xl overflow-hidden transition-colors ${c.isActive && !expired ? "border-[#2a2a3a]" : "border-[#2a2a3a]/50 opacity-60"}`}>
      <div className="flex flex-col md:flex-row">
        {/* Left: Coupon preview card (matches frontend CouponCard) */}
        <div className="md:w-64 shrink-0 bg-[#0e0e18] border-b md:border-b-0 md:border-r border-[#2a2a3a] p-3 flex items-center justify-center">
          <div className="w-full max-w-[240px]">
            <CouponPreviewCard coupon={c} />
          </div>
        </div>

        {/* Right: Info + actions */}
        <div className="flex-1 p-3 md:p-4 flex flex-col gap-3 min-w-0">
          {/* Info block */}
          <div className="min-w-0 th-text">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`shrink-0 whitespace-nowrap text-[10px] px-2 py-0.5 rounded border font-medium ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-amber-400">{c.code}</span>
              {expired && <span className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">หมดอายุ</span>}
              {notStarted && <span className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">ยังไม่เริ่ม</span>}
              {limitReached && <span className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">ใช้ครบ</span>}
              {c.allowRepeatClaim && <span className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">รับซ้ำได้</span>}
            </div>
            <h3 className="text-sm font-medium text-white line-clamp-2">{c.title}</h3>
            <div className="text-[11px] text-[#94a3b8] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="whitespace-nowrap">{cardFormatDate(c.startDate)} → {cardFormatDate(c.endDate)}</span>
              {c.discountType !== "gift" && <span className="whitespace-nowrap">ลด {c.discountValue}{c.discountType === "percent" ? "%" : " บาท"}</span>}
              {c.discountType === "gift" && <span className="whitespace-nowrap">{c.giftDescription}</span>}
            </div>

            {/* Stats labels */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1e2e] border border-[#2a2a3a] text-[11px] whitespace-nowrap">
                <span className="text-[#64748b]">รับแล้ว</span>
                <span className="font-bold text-white">{c.claimCount ?? 0}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1e2e] border border-[#2a2a3a] text-[11px] whitespace-nowrap">
                <span className="text-[#64748b]">ใช้แล้ว</span>
                <span className="font-bold text-white">{c.usageCount}</span>
              </span>
              {c.usageLimit > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1e2e] border border-[#2a2a3a] text-[11px] whitespace-nowrap">
                  <span className="text-[#64748b]">จำกัด</span>
                  <span className="font-bold text-white">{c.usageLimit}</span>
                </span>
              )}
              {c.usageLimit > 0 && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${
                  (c.usageLimit - (c.claimCount ?? 0)) <= 0
                    ? "bg-red-500/15 border border-red-500/30 text-red-400"
                    : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                }`}>
                  <span className="font-normal">เหลือ</span>
                  {Math.max(0, c.usageLimit - (c.claimCount ?? 0))}
                </span>
              )}
            </div>
          </div>

          {/* Primary actions: status toggles + edit + delete */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
            <button
              onClick={onToggle}
              role="switch"
              aria-checked={c.isActive}
              className={`h-9 rounded-lg flex items-center gap-2 px-3 transition-colors cursor-pointer text-xs font-medium whitespace-nowrap ${c.isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-[#1e1e2e] text-[#94a3b8] border border-[#2a2a3a]"}`}
              title={c.isActive ? "กำลังแสดงหน้าเว็บ — กดเพื่อซ่อน" : "ซ่อนอยู่ — กดเพื่อแสดง"}
            >
              <div className={`relative w-7 h-3.5 rounded-full transition-colors ${c.isActive ? "bg-emerald-500" : "bg-[#475569]"}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${c.isActive ? "left-[14px]" : "left-0.5"}`} />
              </div>
              แสดงจริง
            </button>
            <button
              onClick={onToggleTest}
              role="switch"
              aria-checked={c.testMode}
              className={`h-9 rounded-lg flex items-center gap-2 px-3 transition-colors cursor-pointer text-xs font-medium whitespace-nowrap ${c.testMode ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-[#1e1e2e] text-[#94a3b8] border border-[#2a2a3a]"}`}
              title={c.testMode ? "แสดงในหน้าทดสอบ — กดเพื่อปิด" : "ปิดอยู่ — กดเพื่อเปิดในหน้าทดสอบ"}
            >
              <div className={`relative w-7 h-3.5 rounded-full transition-colors ${c.testMode ? "bg-cyan-500" : "bg-[#475569]"}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${c.testMode ? "left-[14px]" : "left-0.5"}`} />
              </div>
              โหมดทดสอบ
            </button>
            <div className="flex-1 min-w-0" />
            <button onClick={onEdit} className="h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 px-3 transition-colors cursor-pointer text-xs font-medium whitespace-nowrap" title="แก้ไขคูปอง">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              แก้ไข
            </button>
            {isAdmin && (
              <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#64748b] hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors cursor-pointer" title="ลบคูปอง" aria-label="ลบคูปอง">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Secondary actions: preview + test + history */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTestClaim(true)} className="h-8 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-white flex items-center gap-1.5 px-3 transition-colors cursor-pointer text-[11px] font-medium whitespace-nowrap" title="ดูหน้า modal ที่ลูกค้าจะเห็น (ไม่นับยอด)">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              ดูตัวอย่าง
            </button>
            <a href="/admin/test-claim" target="_blank" rel="noopener noreferrer" className="h-8 rounded-lg bg-[#1e1e2e] border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1.5 px-3 transition-colors cursor-pointer text-[11px] font-medium no-underline whitespace-nowrap" title="เปิดหน้าทดสอบรับจริง (นับยอด + revert ได้)">
              ทดสอบรับจริง ↗
            </a>
            <button onClick={onShowClaims} className="h-8 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-amber-400 flex items-center gap-1.5 px-3 transition-colors cursor-pointer text-[11px] font-medium whitespace-nowrap" title="ดูรายการคนที่รับคูปองนี้">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              ดูประวัติการรับ
            </button>
          </div>
        </div>
      </div>

      {/* Test claim modal — same as frontend but doesn't count */}
      {testClaim && (
        <CouponClaimModal
          coupon={c}
          serial={`31-${c.serialPrefix || "A"}0 (ทดสอบ)`}
          claimedAt={new Date().toISOString()}
          onClose={() => setTestClaim(false)}
        />
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────

interface ClaimRecord {
  id: string; couponId: string; couponCode: string; serial: string
  claimedAt: string; ip: string; ua: string
}

export default function AdminCouponsPage() {
  const { isAdmin } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[] | null>(null)
  const [claimCouponName, setClaimCouponName] = useState("")
  const [showCropPicker, setShowCropPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const fetchCoupons = useCallback(async () => {
    const res = await fetch("/api/coupons")
    setCoupons(await res.json())
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  // ─── Form actions ──────────────────────────────────────

  const DISCOUNT_MAX: Record<string, number> = { percent: 50, fixed: 500 }

  async function handleSave() {
    if (!form.title || !form.discountType) return
    const val = Number(form.discountValue || 0)
    const max = DISCOUNT_MAX[form.discountType]
    if (max && val > max) {
      alert(`${form.discountType === "percent" ? "เปอร์เซ็นต์ลด" : "จำนวนเงินลด"}ห้ามเกิน ${max}${form.discountType === "percent" ? "%" : " บาท"}`)
      return
    }
    setSaving(true)
    const body = {
      ...form,
      discountValue: val,
      minPurchase: Number(form.minPurchase || 0),
      usageLimit: Number(form.usageLimit || 0),
      category: form.category || null,
      stackWithPoints: form.stackWithPoints,
      allowRepeatClaim: form.allowRepeatClaim,
      testMode: form.testMode,
      startDate: new Date(form.startDate + "T00:00:00+07:00").toISOString(),
      endDate: new Date(form.endDate + "T23:59:59+07:00").toISOString(),
    }

    if (editingId) {
      await fetch(`/api/coupons/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } else {
      await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setSaving(false)
    fetchCoupons()
    closeForm()
  }

  function handleEdit(c: Coupon) {
    setForm({
      title: c.title,
      code: c.code,
      description: c.description,
      image: c.image,
      discountType: c.discountType,
      discountValue: c.discountValue ? String(c.discountValue) : "",
      giftDescription: c.giftDescription,
      category: c.category || "",
      minPurchase: String(c.minPurchase),
      startDate: c.startDate.slice(0, 10),
      endDate: c.endDate.slice(0, 10),
      isActive: c.isActive,
      testMode: c.testMode ?? false,
      usageLimit: String(c.usageLimit),
      stackWithPoints: c.stackWithPoints ?? true,
      allowRepeatClaim: c.allowRepeatClaim ?? false,
    })
    setEditingId(c.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบคูปองนี้?")) return
    await fetch(`/api/coupons/${id}`, { method: "DELETE" })
    fetchCoupons()
  }

  async function handleToggleActive(c: Coupon) {
    await fetch(`/api/coupons/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) })
    fetchCoupons()
  }

  async function handleToggleTest(c: Coupon) {
    await fetch(`/api/coupons/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testMode: !c.testMode }) })
    fetchCoupons()
  }

  function closeForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  async function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setForm({ ...form, code })
  }

  async function handleImageCrop(file: File, crop: { x: number; y: number; size: number }) {
    setShowCropPicker(false)
    setUploadingImage(true)
    try {
      // Build Cloudinary transformation for 1:1 crop
      const transforms = crop.size > 0
        ? `c_crop,w_${crop.size},h_${crop.size},x_${crop.x},y_${crop.y}/c_fill,w_400,h_400`
        : "c_fill,w_400,h_400"

      // 1. Get signed params from server (tiny request, no file)
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "coupons", transformation: transforms }),
      })
      const sign = await signRes.json()
      if (!sign.signature) throw new Error(sign.error || "Failed to get signature")

      // 2. Upload directly to Cloudinary (no Vercel size limit)
      // Must send exactly the same params that were signed
      const fd = new FormData()
      fd.append("file", file)
      fd.append("api_key", sign.apiKey)
      fd.append("timestamp", String(sign.timestamp))
      fd.append("signature", sign.signature)
      fd.append("folder", sign.folder)
      fd.append("format", sign.format)
      if (sign.transformation) fd.append("transformation", sign.transformation)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      })
      const result = await uploadRes.json()

      if (result.secure_url) {
        setForm((prev) => ({ ...prev, image: result.secure_url }))
      } else {
        alert("อัปโหลดไม่สำเร็จ: " + (result.error?.message || "Cloudinary error"))
      }
    } catch (e) {
      alert("อัปโหลดไม่สำเร็จ: " + (e instanceof Error ? e.message : "network error"))
    }
    setUploadingImage(false)
  }

  async function showClaims(c: Coupon) {
    setClaimCouponName(c.title)
    setClaimHistory([]) // show loading
    const res = await fetch(`/api/admin/coupon-claims?couponId=${c.id}`)
    const data = await res.json()
    setClaimHistory(data.claims || [])
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-white whitespace-nowrap">จัดการคูปอง</h1>
          <button onClick={fetchCoupons} className="shrink-0 w-9 h-9 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90" title="รีเฟรชข้อมูล" aria-label="รีเฟรช">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="shrink-0 h-9 md:h-10 px-3 md:px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs md:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap">
            + สร้างคูปอง
          </button>
        )}
      </div>

      {/* ─── Form ─── */}
      {showForm && (
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-white">{editingId ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}</h2>
            <button onClick={closeForm} className="text-[#64748b] hover:text-white text-xl cursor-pointer">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <SectionHeader>ข้อมูลหลัก</SectionHeader>
              <div>
                <FieldLabel required>ชื่อคูปอง</FieldLabel>
                <TextInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="ลด 10% สีทาบ้าน" />
              </div>
              <div>
                <FieldLabel>รหัสคูปอง</FieldLabel>
                <div className="flex gap-2">
                  <TextInput value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="PAINT10" mono />
                  <button onClick={generateCode} className="px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] hover:text-white text-xs whitespace-nowrap cursor-pointer">
                    สุ่มรหัส
                  </button>
                </div>
                <Barcode value={form.code} variant="transparent" />
              </div>
              <div>
                <FieldLabel>รายละเอียด</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="เงื่อนไขเพิ่มเติม..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm focus:border-[#94a3b8] outline-none resize-none"
                />
              </div>

              {/* Image picker */}
              <div>
                <FieldLabel>ภาพประกอบคูปอง</FieldLabel>
                {form.image ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0">
                      <Image src={form.image} alt="" fill className="object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowCropPicker(true)}
                        className="px-3 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        เปลี่ยนภาพ
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image: "" })}
                        className="px-3 py-1.5 text-red-400/70 hover:text-red-400 text-xs cursor-pointer transition-colors"
                      >
                        ลบภาพ
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCropPicker(true)}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e2e] border border-dashed border-[#2a2a3a] hover:border-[#94a3b8] rounded-lg text-[#94a3b8] hover:text-white text-xs cursor-pointer transition-colors w-full justify-center"
                  >
                    {uploadingImage ? (
                      <span className="animate-pulse">กำลังอัปโหลด...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                        เลือกภาพ (1:1)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <SectionHeader>ส่วนลด</SectionHeader>
              <div>
                <FieldLabel required>ประเภท</FieldLabel>
                <div className="flex gap-2">
                  {(["percent", "fixed", "gift"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, discountType: t })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        form.discountType === t ? TYPE_LABELS[t].color : "bg-[#1e1e2e] border-[#2a2a3a] text-[#64748b]"
                      }`}
                    >
                      {TYPE_LABELS[t].label}
                    </button>
                  ))}
                </div>
              </div>
              {form.discountType !== "gift" && (
                <div>
                  <FieldLabel>{form.discountType === "percent" ? "เปอร์เซ็นต์ลด (สูงสุด 50%)" : "จำนวนเงินลด (สูงสุด 500 บาท)"}</FieldLabel>
                  <TextInput value={form.discountValue} onChange={(v) => {
                    const max = form.discountType === "percent" ? 50 : 500
                    const num = Number(v)
                    if (v && num > max) return
                    setForm({ ...form, discountValue: v })
                  }} type="number" placeholder={form.discountType === "percent" ? "10" : "50"} />
                </div>
              )}
              {form.discountType === "gift" && (
                <div>
                  <FieldLabel>ของแถม</FieldLabel>
                  <TextInput value={form.giftDescription} onChange={(v) => setForm({ ...form, giftDescription: v })} placeholder="ฟรี ถุงมือช่าง 1 คู่" />
                </div>
              )}
              <div>
                <FieldLabel>หมวดหมู่ (เว้นว่าง = ทุกหมวด)</FieldLabel>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm focus:border-[#94a3b8] outline-none"
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>ซื้อขั้นต่ำ (บาท)</FieldLabel>
                <TextInput value={form.minPurchase} onChange={(v) => setForm({ ...form, minPurchase: v })} type="number" placeholder="0" />
              </div>

              <SectionHeader>ระยะเวลา</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>วันเริ่ม</FieldLabel>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm focus:border-[#94a3b8] outline-none" />
                </div>
                <div>
                  <FieldLabel>วันหมดอายุ</FieldLabel>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm focus:border-[#94a3b8] outline-none" />
                </div>
              </div>

              <SectionHeader>ตั้งค่า</SectionHeader>
              <div>
                <FieldLabel>จำนวนจำกัด (0 = ไม่จำกัด)</FieldLabel>
                <TextInput value={form.usageLimit} onChange={(v) => setForm({ ...form, usageLimit: v })} type="number" placeholder="0" />
              </div>
              <Toggle checked={form.testMode} onChange={(v) => setForm({ ...form, testMode: v })} label="แสดงหน้าทดสอบ (admin)" color="primary" />
              <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="แสดงหน้าเว็บจริง (ลูกค้า)" color="emerald" />
              <Toggle checked={form.stackWithPoints} onChange={(v) => setForm({ ...form, stackWithPoints: v })} label="ใช้ร่วมกับโปรรับแต้มสามหนึ่งได้" color="amber" />
              <Toggle checked={form.allowRepeatClaim} onChange={(v) => setForm({ ...form, allowRepeatClaim: v })} label="อนุญาตรับคูปองซ้ำ (ไม่จำกัดครั้ง)" color="primary" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2a2a3a]">
            <button onClick={closeForm} className="px-4 py-2 text-sm text-[#94a3b8] hover:text-white transition-colors cursor-pointer">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving || !form.title} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
              {saving ? "กำลังบันทึก..." : editingId ? "บันทึก" : "สร้างคูปอง"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Coupon List ─── */}
      <div className="space-y-4">
        {coupons.length === 0 && (
          <div className="text-center text-[#64748b] py-16 text-sm">ยังไม่มีคูปอง</div>
        )}
        {coupons.map((c) => (
          <CouponRow
            key={c.id}
            coupon={c}
            isAdmin={isAdmin}
            onEdit={() => handleEdit(c)}
            onDelete={() => handleDelete(c.id)}
            onToggle={() => handleToggleActive(c)}
            onToggleTest={() => handleToggleTest(c)}
            onShowClaims={() => showClaims(c)}
          />
        ))}
      </div>

      {/* ─── Claim History Modal ─── */}
      {claimHistory !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setClaimHistory(null)} />
          <div className="relative bg-[#13131d] border border-[#2a2a3a] rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a3a]">
              <h3 className="text-sm font-bold text-white">ประวัติการรับ — {claimCouponName}</h3>
              <button onClick={() => setClaimHistory(null)} className="text-[#64748b] hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {claimHistory.length === 0 ? (
                <p className="text-center text-[#64748b] text-sm py-8">ยังไม่มีคนรับคูปองนี้</p>
              ) : (() => {
                // Count IP occurrences to flag duplicates
                const ipCount = new Map<string, number>()
                for (const cl of claimHistory) {
                  ipCount.set(cl.ip, (ipCount.get(cl.ip) || 0) + 1)
                }
                const dupIps = new Set([...ipCount.entries()].filter(([, c]) => c > 1).map(([ip]) => ip))

                return (
                  <div className="space-y-2">
                    {dupIps.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2">
                        <span className="text-amber-400 text-[11px] font-medium">IP ซ้ำ {dupIps.size} รายการ</span>
                        <span className="text-[10px] text-amber-400/60">(อาจเป็น ISP มือถือแจก IP ซ้ำ หรือคนเดียวกดหลายครั้ง)</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[40px_70px_1fr_90px] gap-2 text-[10px] text-[#64748b] uppercase tracking-wider pb-2 border-b border-[#2a2a3a]">
                      <span>#</span>
                      <span>Serial</span>
                      <span>เวลา</span>
                      <span>IP</span>
                    </div>
                    {claimHistory.map((cl, i) => {
                      const isDup = dupIps.has(cl.ip)
                      return (
                        <div key={cl.id} className={`grid grid-cols-[40px_70px_1fr_90px] gap-2 text-xs py-1.5 border-b border-[#2a2a3a]/50 ${isDup ? "bg-amber-500/5" : ""}`}>
                          <span className="text-[#64748b]">{i + 1}</span>
                          <span className="font-mono text-amber-400">{cl.serial}</span>
                          <span className="text-[#94a3b8]">{new Date(cl.claimedAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          <span className={`font-mono text-[11px] ${isDup ? "text-amber-400" : "text-[#94a3b8]"}`}>
                            {cl.ip}
                            {isDup && <span className="ml-1 text-[9px]">×{ipCount.get(cl.ip)}</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Crop Picker ─── */}
      {showCropPicker && (
        <ImageCropPicker
          onConfirm={handleImageCrop}
          onCancel={() => setShowCropPicker(false)}
        />
      )}
    </div>
  )
}
