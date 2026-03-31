"use client"

import { useState, useEffect, useCallback } from "react"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

const STORAGE_KEY = "claimed_coupons"

export default function TestClaimPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [resetting, setResetting] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/coupons?test=true")
    setCoupons(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  function showMsg(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(""), 4000)
  }

  async function handleReset(c: Coupon) {
    if (!confirm(`ล้างข้อมูลการรับคูปอง "${c.title}" ทั้งหมด?\ncount จะกลับเป็น 0 และ claim records จะถูกลบ`)) return
    setResetting(c.id)
    try {
      const res = await fetch("/api/admin/reset-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId: c.id }),
      })
      const data = await res.json()
      if (res.ok) {
        showMsg(`ล้างแล้ว — ลบ ${data.removedCount} records, count = 0`)
        // Clear localStorage for this coupon
        try {
          const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
          delete map[c.id]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
        } catch {}
        setRefreshKey((k) => k + 1)
        fetchCoupons()
      } else {
        showMsg(`ล้างไม่สำเร็จ: ${data.error}`)
      }
    } catch {
      showMsg("ล้างไม่สำเร็จ — network error")
    }
    setResetting(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">ทดสอบคูปอง</h1>
          <p className="text-xs text-[#64748b]">แสดงเฉพาะคูปองที่เปิด toggle "ทดสอบ" — รับจริง นับจริง</p>
        </div>
        <button
          onClick={fetchCoupons}
          className="w-8 h-8 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
          title="รีเฟรช"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {msg && (
        <div className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 mb-4">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-[#1e1e2e] rounded-xl animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-8 text-center">
          <p className="text-sm text-[#64748b] mb-2">ไม่มีคูปองที่เปิด toggle "ทดสอบ"</p>
          <p className="text-xs text-[#475569]">ไปที่หน้าจัดการคูปอง → กดปุ่ม "ทดสอบ" (สีฟ้า) บนคูปองที่ต้องการ</p>
        </div>
      ) : (
        <div className="space-y-6" key={refreshKey}>
          {coupons.map((c) => (
            <div key={c.id}>
              <CouponCard coupon={c} />

              {/* Admin controls */}
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-[#475569]">
                  รับแล้ว {c.claimCount}/{c.usageLimit || "∞"}
                </span>
                <button
                  onClick={() => handleReset(c)}
                  disabled={resetting === c.id}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-medium rounded-lg hover:bg-red-500/20 cursor-pointer transition-colors disabled:opacity-40"
                >
                  {resetting === c.id ? "กำลังล้าง..." : "ล้างข้อมูลการรับทั้งหมด"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-[#13131d] border border-[#2a2a3a] rounded-xl text-[11px] text-[#64748b] space-y-1">
        <p><strong className="text-white/60">Flow การทดสอบ:</strong></p>
        <p>1. สร้างคูปอง → เปิด toggle <span className="text-cyan-400">ทดสอบ</span> (สีฟ้า)</p>
        <p>2. เข้าหน้านี้ → ทดสอบรับคูปองจนพอใจ</p>
        <p>3. กด <span className="text-red-400">"ล้างข้อมูลการรับทั้งหมด"</span> → count กลับเป็น 0</p>
        <p>4. กลับไปหน้าจัดการ → เปิด toggle <span className="text-emerald-400">แสดง</span> (สีเขียว) → ไปหน้าเว็บจริง</p>
      </div>
    </div>
  )
}
