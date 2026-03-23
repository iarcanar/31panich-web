"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import JsBarcode from "jsbarcode"
import { CATEGORIES } from "@/lib/categories"
import type { Coupon } from "@/lib/coupons"
import { useAuth } from "../layout"

// ─── Reusable UI (matching products admin style) ─────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider mb-3">{children}</h3>
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = "text", mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm transition-colors focus:border-[#94a3b8] outline-none ${mono ? "font-mono" : ""} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  )
}

function Toggle({ checked, onChange, label, color = "primary" }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; color?: "primary" | "emerald" | "amber"
}) {
  const colors = { primary: "bg-[#94a3b8]", emerald: "bg-emerald-500", amber: "bg-amber-500" }
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 group cursor-pointer">
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? colors[color] : "bg-[#1e1e2e] border border-[#2a2a3a]"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? "left-[18px]" : "left-0.5"}`} />
      </div>
      <span className={`text-sm transition-colors ${checked ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>{label}</span>
    </button>
  )
}

function BarcodePreview({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current && value) {
      try { JsBarcode(ref.current, value, { format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 12, background: "transparent", lineColor: "#94a3b8" }) } catch {}
    }
  }, [value])
  if (!value) return null
  return <svg ref={ref} className="mt-2" />
}

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
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  isActive: true,
  usageLimit: "0",
  stackWithPoints: true,
  allowRepeatClaim: false,
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  percent: { label: "% ลด", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  fixed: { label: "฿ ลด", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  gift: { label: "ของแถม", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
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

  const fetchCoupons = useCallback(async () => {
    const res = await fetch("/api/coupons")
    setCoupons(await res.json())
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  // ─── Form actions ──────────────────────────────────────

  async function handleSave() {
    if (!form.title || !form.discountType) return
    setSaving(true)
    const body = {
      ...form,
      discountValue: Number(form.discountValue || 0),
      minPurchase: Number(form.minPurchase || 0),
      usageLimit: Number(form.usageLimit || 0),
      category: form.category || null,
      stackWithPoints: form.stackWithPoints,
      allowRepeatClaim: form.allowRepeatClaim,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate + "T23:59:59").toISOString(),
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
      usageLimit: String(c.usageLimit),
      stackWithPoints: c.stackWithPoints ?? true,
      allowRepeatClaim: c.allowRepeatClaim ?? false,
    })
    setEditingId(c.id)
    setShowForm(true)
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

  async function showClaims(c: Coupon) {
    setClaimCouponName(c.title)
    setClaimHistory([]) // show loading
    const res = await fetch(`/api/admin/coupon-claims?couponId=${c.id}`)
    const data = await res.json()
    setClaimHistory(data.claims || [])
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">จัดการคูปอง</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
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
                <BarcodePreview value={form.code} />
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
                  <FieldLabel>{form.discountType === "percent" ? "เปอร์เซ็นต์ลด" : "จำนวนเงินลด (บาท)"}</FieldLabel>
                  <TextInput value={form.discountValue} onChange={(v) => setForm({ ...form, discountValue: v })} type="number" placeholder={form.discountType === "percent" ? "10" : "50"} />
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
              <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="เปิดใช้งาน" color="emerald" />
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
      <div className="space-y-3">
        {coupons.length === 0 && (
          <div className="text-center text-[#64748b] py-16 text-sm">ยังไม่มีคูปอง</div>
        )}
        {coupons.map((c) => {
          const typeInfo = TYPE_LABELS[c.discountType]
          const now = new Date().toISOString()
          const expired = c.endDate < now
          const notStarted = c.startDate > now
          const limitReached = c.usageLimit > 0 && c.usageCount >= c.usageLimit

          return (
            <div key={c.id} className={`bg-[#13131d] border rounded-xl p-4 transition-colors ${c.isActive && !expired ? "border-[#2a2a3a]" : "border-[#2a2a3a]/50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="font-mono text-xs text-amber-400">{c.code}</span>
                    {expired && <span className="text-[10px] text-red-400">หมดอายุ</span>}
                    {notStarted && <span className="text-[10px] text-blue-400">ยังไม่เริ่ม</span>}
                    {limitReached && <span className="text-[10px] text-orange-400">ใช้ครบแล้ว</span>}
                    {c.allowRepeatClaim && <span className="text-[10px] text-sky-400">รับซ้ำได้</span>}
                  </div>
                  <h3 className="text-sm font-medium text-white truncate">{c.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#64748b]">
                    <span>
                      {c.discountType === "percent" && `ลด ${c.discountValue}%`}
                      {c.discountType === "fixed" && `ลด ${c.discountValue} บาท`}
                      {c.discountType === "gift" && c.giftDescription}
                    </span>
                    <span>{c.startDate.slice(0, 10)} → {c.endDate.slice(0, 10)}</span>
                    <span>ใช้แล้ว {c.usageCount}{c.usageLimit > 0 ? `/${c.usageLimit}` : ""}</span>
                    <button onClick={() => showClaims(c)} className="text-amber-400 hover:text-amber-300 cursor-pointer">
                      รับแล้ว {c.claimCount ?? 0} คน
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => showClaims(c)} className="w-8 h-8 rounded-lg bg-[#1e1e2e] text-[#94a3b8] hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer" title="ประวัติการรับ">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button onClick={() => handleToggleActive(c)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${c.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-[#1e1e2e] text-[#64748b]"}`} title={c.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                    {c.isActive ? "✓" : "○"}
                  </button>
                  <button onClick={() => handleEdit(c)} className="w-8 h-8 rounded-lg bg-[#1e1e2e] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer" title="แก้ไข">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg bg-[#1e1e2e] text-[#64748b] hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer" title="ลบ">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
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
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[60px_80px_1fr_80px] gap-2 text-[10px] text-[#64748b] uppercase tracking-wider pb-2 border-b border-[#2a2a3a]">
                    <span>#</span>
                    <span>Serial</span>
                    <span>เวลา</span>
                    <span>IP</span>
                  </div>
                  {claimHistory.map((cl, i) => (
                    <div key={cl.id} className="grid grid-cols-[60px_80px_1fr_80px] gap-2 text-xs text-[#94a3b8] py-1.5 border-b border-[#2a2a3a]/50">
                      <span className="text-[#64748b]">{i + 1}</span>
                      <span className="font-mono text-amber-400">{cl.serial}</span>
                      <span>{new Date(cl.claimedAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="font-mono text-[11px]">{cl.ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
