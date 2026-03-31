"use client"

import { useState, useEffect, useCallback } from "react"
import type { Coupon } from "@/lib/coupons"
import CouponCard from "@/components/coupon/CouponCard"

const STORAGE_KEY = "claimed_coupons"

export default function TestClaimPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [lastAction, setLastAction] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/coupons?active=true")
    setCoupons(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  function resetLocalStorage() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem("claim_counters")
    setLastAction("ลบ localStorage แล้ว — รีเฟรชหน้าเพื่อทดสอบใหม่")
    setRefreshKey((k) => k + 1)
  }

  async function revertLastClaim(couponId: string) {
    setLastAction("กำลัง revert...")
    try {
      const res = await fetch("/api/admin/revert-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId }),
      })
      const data = await res.json()
      if (res.ok) {
        setLastAction(`Revert สำเร็จ — ลบ serial ${data.removedSerial}, count กลับเป็น ${data.newCount}`)
        // Clear from localStorage too
        try {
          const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
          delete map[couponId]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
        } catch {}
        setRefreshKey((k) => k + 1)
        fetchCoupons()
      } else {
        setLastAction(`Revert ไม่สำเร็จ: ${data.error}`)
      }
    } catch {
      setLastAction("Revert ไม่สำเร็จ — network error")
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">ทดสอบรับคูปอง (Live)</h1>
        <p className="text-xs text-[#64748b]">หน้านี้แสดงคูปองเหมือนลูกค้าเห็น — กดรับ = นับจริง, serial จริง</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={resetLocalStorage}
          className="px-3 py-2 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/25 cursor-pointer transition-colors"
        >
          Reset localStorage (ทดสอบซ้ำ)
        </button>
        <button
          onClick={fetchCoupons}
          className="px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] text-xs font-medium rounded-lg hover:text-white cursor-pointer transition-colors"
        >
          Refresh คูปอง
        </button>
      </div>

      {/* Status */}
      {lastAction && (
        <div className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 mb-4">
          {lastAction}
        </div>
      )}

      {/* Coupon cards — exact same as frontend */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-[#1e1e2e] rounded-xl animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-[#64748b] text-center py-12">ไม่มีคูปองที่ active อยู่</p>
      ) : (
        <div className="space-y-4" key={refreshKey}>
          {coupons.map((c) => (
            <div key={c.id}>
              {/* Real CouponCard — identical to customer view */}
              <CouponCard coupon={c} />

              {/* Admin: revert button */}
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <span className="text-[10px] text-[#475569]">
                  count: {c.claimCount}/{c.usageLimit || "∞"}
                </span>
                <button
                  onClick={() => revertLastClaim(c.id)}
                  className="text-[10px] text-amber-400/70 hover:text-amber-400 cursor-pointer transition-colors"
                >
                  ↩ revert claim ล่าสุด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-[#13131d] border border-[#2a2a3a] rounded-xl text-[11px] text-[#64748b] space-y-1">
        <p><strong className="text-white/60">วิธีทดสอบ:</strong></p>
        <p>1. กด "รับคูปอง" → ดูว่าปุ่มขึ้น "กำลังรับ..." แล้ว modal เปิดพร้อม serial จริง</p>
        <p>2. กด "Reset localStorage" → แล้ว Refresh → กดรับอีกครั้งได้</p>
        <p>3. กด "↩ revert claim ล่าสุด" → ลบ claim record + ลด count กลับ 1</p>
        <p>4. ทุกอย่างเป็น live จริง — ระวังทดสอบกับคูปองที่ลูกค้ากำลังใช้อยู่</p>
      </div>
    </div>
  )
}
