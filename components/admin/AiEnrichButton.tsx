"use client"

import { useState } from "react"

interface Props {
  productId: string | null
  currentDescription: string
  onDescriptionChange: (desc: string) => void
}

interface CheckResult {
  findings: string
  status: "ok" | "warning" | "error"
  statusLabel: string
  suggestedDescription: string | null
}

export default function AiEnrichButton({ productId, currentDescription, onDescriptionChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [action, setAction] = useState<"check" | "suggest" | null>(null)

  if (!productId) return null

  async function handleAction(act: "check" | "suggest") {
    setLoading(true)
    setResult(null)
    setCheckResult(null)
    setAction(act)
    try {
      const res = await fetch("/api/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action: act }),
      })
      const data = await res.json()

      if (act === "suggest") {
        setResult(data.result || data.error || "เกิดข้อผิดพลาด")
      } else {
        setCheckResult({
          findings: data.result || data.error || "เกิดข้อผิดพลาด",
          status: data.status || "warning",
          statusLabel: data.statusLabel || "ตรวจสอบเสร็จแล้ว",
          suggestedDescription: data.suggestedDescription || null,
        })
      }
    } catch {
      if (act === "suggest") {
        setResult("ไม่สามารถเชื่อมต่อระบบ AI ได้")
      } else {
        setCheckResult({
          findings: "ไม่สามารถเชื่อมต่อระบบ AI ได้",
          status: "error",
          statusLabel: "เชื่อมต่อไม่ได้",
          suggestedDescription: null,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    const scrollY = window.scrollY
    setResult(null)
    setCheckResult(null)
    setAction(null)
    requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  const statusColors = {
    ok: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    warning: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    error: "text-red-400 bg-red-400/10 border-red-400/30",
  }

  return (
    <div className="mt-2 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">AI:</span>
        <button
          type="button"
          onClick={() => handleAction("suggest")}
          disabled={loading}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition"
        >
          เขียนคำอธิบาย
        </button>
        <span className="text-gray-700">|</span>
        <button
          type="button"
          onClick={() => handleAction("check")}
          disabled={loading}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition"
        >
          ตรวจสอบข้อมูล
        </button>
        {loading && (
          <span className="text-[10px] text-gray-500 animate-pulse">
            {action === "suggest" ? "กำลังค้นหาข้อมูลและเขียน..." : "กำลังตรวจสอบและค้นหาข้อมูลเพิ่มเติม..."}
          </span>
        )}
      </div>

      {/* Suggest result */}
      {result && action === "suggest" && (
        <div className="mt-2 bg-[#12121c] border border-[#2a2a3a] rounded-lg p-3 text-xs text-gray-300 whitespace-pre-line leading-relaxed">
          {result}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                onDescriptionChange(result)
                handleClear()
              }}
              className="text-[11px] bg-cyan-500/15 text-cyan-400 px-3 py-1 rounded-full hover:bg-cyan-500/25 transition"
            >
              ใช้คำอธิบายนี้
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Check result */}
      {checkResult && (
        <div className="mt-2 bg-[#12121c] border border-[#2a2a3a] rounded-lg p-3 text-xs leading-relaxed">
          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border mb-2 ${statusColors[checkResult.status]}`}>
            {checkResult.statusLabel}
          </span>
          <div className="text-gray-300 whitespace-pre-line mb-3">
            {checkResult.findings}
          </div>

          {/* คำอธิบายที่ปรับปรุงแล้ว */}
          {checkResult.suggestedDescription && (
            <div className="border-t border-[#2a2a3a] pt-3">
              <p className="text-[10px] text-gray-500 mb-1.5">คำอธิบายที่ปรับปรุงแล้ว:</p>
              <textarea
                value={checkResult.suggestedDescription}
                onChange={(e) => setCheckResult((prev) => prev ? { ...prev, suggestedDescription: e.target.value } : prev)}
                className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg p-2.5 text-xs text-gray-200 leading-relaxed resize-y min-h-[80px] focus:border-cyan-500/50 focus:outline-none"
                rows={6}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (checkResult.suggestedDescription) {
                      onDescriptionChange(checkResult.suggestedDescription)
                      handleClear()
                    }
                  }}
                  className="text-[11px] bg-cyan-500/20 text-cyan-400 px-4 py-1.5 rounded-full hover:bg-cyan-500/30 transition font-medium"
                >
                  นำไปใช้
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}

          {/* กรณีไม่มี suggestedDescription (ไม่ควรเกิดแต่ fallback) */}
          {!checkResult.suggestedDescription && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition"
              >
                ปิด
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
