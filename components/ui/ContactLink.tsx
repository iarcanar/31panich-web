"use client"

import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, LINE_URL, HOURS_TEXT } from "@/lib/store-config"
import { fmtShort, holidayShortName } from "@/lib/date-utils"

interface Props {
  type: "phone" | "line"
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export default function ContactLink({ type, children, className = "", onClick }: Props) {
  const { isOpen, holiday, isHoliday } = useBusinessHours()

  const closedText = isHoliday && holiday
    ? `หยุด${holidayShortName(holiday.name)} · เปิด ${fmtShort(holiday.reopenDate)}`
    : `นอกเวลาทำการ · เปิด ${HOURS_TEXT}`

  // ปิดทำการ → แสดง label แทนปุ่ม
  if (!isOpen) {
    return (
      <span className={`relative inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed select-none ${className}`}>
        {children}
        <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap">
          <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {closedText}
        </span>
      </span>
    )
  }

  return (
    <a
      href={type === "phone" ? `tel:${PHONE_RAW}` : LINE_URL}
      target={type === "line" ? "_blank" : undefined}
      rel={type === "line" ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  )
}
