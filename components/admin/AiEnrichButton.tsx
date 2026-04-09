"use client"

import { useState } from "react"

interface Props {
  productId: string | null
  currentDescription: string
  onDescriptionChange: (desc: string) => void
  onFlash?: () => void
  /** Called when user clicks AI before saving the product. Should save the
   *  draft and return the new product id, or null if validation fails. */
  onRequestSave?: () => Promise<string | null>
}

export default function AiEnrichButton({ productId, currentDescription, onDescriptionChange, onFlash, onRequestSave }: Props) {
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<"check" | "suggest" | null>(null)
  const [status, setStatus] = useState<{ label: string; type: "ok" | "warning" | "error" } | null>(null)

  async function handleAction(act: "check" | "suggest") {
    setLoading(true)
    setStatus(null)
    setAction(act)
    try {
      // Resolve product id: use existing one, or save the draft first
      let id = productId
      if (!id) {
        if (!onRequestSave) {
          setStatus({ label: "กรุณาบันทึกสินค้าก่อน", type: "warning" })
          setLoading(false)
          return
        }
        setStatus({ label: "กำลังบันทึกสินค้าก่อน...", type: "ok" })
        id = await onRequestSave()
        if (!id) {
          setStatus({ label: "กรุณากรอกชื่อสินค้าและราคา (หรือเพิ่มตัวเลือก) ก่อน", type: "warning" })
          setLoading(false)
          return
        }
      }

      const res = await fetch("/api/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, action: act }),
      })
      const data = await res.json()

      if (act === "suggest") {
        const text = data.result || ""
        if (text && !data.error) {
          onDescriptionChange(text)
          onFlash?.()
          setStatus({ label: "เขียนเสร็จแล้ว — ใส่ในกล่องรายละเอียดแล้ว", type: "ok" })
        } else {
          setStatus({ label: data.error || "เกิดข้อผิดพลาด", type: "error" })
        }
      } else {
        const suggested = data.suggestedDescription || ""
        if (suggested) {
          onDescriptionChange(suggested)
          onFlash?.()
          setStatus({ label: data.statusLabel || "ตรวจสอบเสร็จ — อัปเดตในกล่องรายละเอียดแล้ว", type: data.status || "ok" })
        } else {
          setStatus({ label: data.statusLabel || "ตรวจสอบเสร็จแล้ว (ไม่มีการเปลี่ยนแปลง)", type: data.status || "ok" })
        }
      }
    } catch {
      setStatus({ label: "ไม่สามารถเชื่อมต่อระบบ AI ได้", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    ok: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400",
  }

  return (
    <div className="mt-2 mb-3">
      <div className="flex items-center gap-2 flex-wrap">
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
        {!loading && status && (
          <span className={`text-[10px] ${statusColors[status.type]} animate-fade-in`}>
            {status.label}
          </span>
        )}
      </div>
    </div>
  )
}
