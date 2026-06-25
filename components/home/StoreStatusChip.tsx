"use client"

import { useBusinessHours } from "@/hooks/useBusinessHours"
import { HOURS_TEXT } from "@/lib/store-config"

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-wide th-text select-none"

export default function StoreStatusChip() {
  const { isOpen, holiday, isHoliday } = useBusinessHours()

  if (isOpen) {
    return (
      <div
        className={chipBase}
        style={{
          background: "rgba(13, 36, 18, 0.62)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(74,222,128,0.38)",
          boxShadow:
            "0 0 18px rgba(74,222,128,0.18), inset 0 1px 0 rgba(74,222,128,0.18), inset 0 -1px 0 rgba(0,0,0,0.1)",
        }}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
          <span
            className="relative h-2 w-2 rounded-full bg-green-400"
            style={{ boxShadow: "0 0 8px rgba(74,222,128,0.95)" }}
          />
        </span>
        <span className="text-green-300">เปิดอยู่</span>
      </div>
    )
  }

  const label =
    isHoliday && holiday
      ? `หยุด · เปิด${holiday.reopenDayName}`
      : `ร้านปิด · ${HOURS_TEXT}`

  return (
    <div
      className={chipBase}
      style={{
        background: "rgba(36, 12, 12, 0.62)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(248,113,113,0.32)",
        boxShadow:
          "0 0 14px rgba(248,113,113,0.14), inset 0 1px 0 rgba(248,113,113,0.14), inset 0 -1px 0 rgba(0,0,0,0.1)",
      }}
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400"
        style={{ boxShadow: "0 0 8px rgba(248,113,113,0.9)" }}
      />
      <span className="text-red-300">{label}</span>
    </div>
  )
}
