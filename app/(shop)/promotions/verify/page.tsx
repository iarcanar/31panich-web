"use client"

import { useState } from "react"

interface VerifyResult {
  valid: boolean
  reason: string
  coupon?: {
    code: string
    title: string
    discountType: string
    discountValue: number
    giftDescription: string
    usageCount: number
    usageLimit: number
  }
}

export default function VerifyPage() {
  const [code, setCode] = useState("")
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [redeemed, setRedeemed] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setResult(null)
    setRedeemed(false)
    try {
      const res = await fetch("/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ valid: false, reason: "เกิดข้อผิดพลาดในการเชื่อมต่อ" })
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem() {
    setLoading(true)
    try {
      const res = await fetch("/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), redeem: true }),
      })
      const data = await res.json()
      setResult(data)
      if (data.valid) setRedeemed(true)
    } catch {
      setResult({ valid: false, reason: "เกิดข้อผิดพลาด" })
    } finally {
      setLoading(false)
    }
  }

  function discountLabel(c: VerifyResult["coupon"]) {
    if (!c) return ""
    if (c.discountType === "percent") return `ลด ${c.discountValue}%`
    if (c.discountType === "fixed") return `ลด ${c.discountValue} บาท`
    return c.giftDescription || "ของแถมฟรี"
  }

  return (
    <div className="bg-[#0e0e14] min-h-screen flex items-start justify-center pt-16 md:pt-24 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-white mb-1 text-center">ตรวจสอบคูปอง</h1>
        <p className="text-xs text-white/40 mb-8 text-center">สำหรับพนักงาน — กรอกรหัสคูปองจากลูกค้า</p>

        <form onSubmit={handleVerify} className="flex gap-2 mb-6">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="กรอกรหัสคูปอง"
            className="flex-1 bg-[#1a1a28] border border-white/10 rounded-xl px-4 py-3 text-white
              placeholder-white/30 text-center text-lg font-mono tracking-wider
              focus:outline-none focus:border-white/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-5 py-3 rounded-xl bg-white/10 text-white font-medium text-sm
              hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            {loading ? "..." : "ตรวจสอบ"}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-5 ${
            result.valid
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{result.valid ? "✅" : "❌"}</span>
              <span className={`font-semibold ${result.valid ? "text-emerald-400" : "text-red-400"}`}>
                {result.reason}
              </span>
            </div>

            {result.coupon && (
              <div className="mt-3 space-y-1 text-sm text-white/70">
                <p><span className="text-white/40">รหัส:</span> {result.coupon.code}</p>
                <p><span className="text-white/40">ชื่อ:</span> {result.coupon.title}</p>
                <p><span className="text-white/40">ส่วนลด:</span> {discountLabel(result.coupon)}</p>
                {result.coupon.usageLimit > 0 && (
                  <p><span className="text-white/40">ใช้ไป:</span> {result.coupon.usageCount} / {result.coupon.usageLimit}</p>
                )}
              </div>
            )}

            {result.valid && !redeemed && (
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="mt-4 w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold
                  hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                ยืนยันการใช้คูปอง
              </button>
            )}

            {redeemed && (
              <div className="mt-4 text-center py-3 rounded-xl bg-emerald-500/20 text-emerald-300 font-semibold text-sm">
                ✅ บันทึกการใช้คูปองเรียบร้อยแล้ว
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
