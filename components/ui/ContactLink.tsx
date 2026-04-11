"use client"

import { useState, useEffect, useRef } from "react"
import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, LINE_URL, HOURS_TEXT } from "@/lib/store-config"

interface Props {
  type: "phone" | "line"
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export default function ContactLink({ type, children, className = "", onClick }: Props) {
  const { isOpen, holiday, isHoliday } = useBusinessHours()
  const [showClosed, setShowClosed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (onClick) onClick(e)
    if (!isOpen) {
      e.preventDefault()
      setShowClosed(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShowClosed(false), 3000)
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const closedText = isHoliday && holiday
    ? `หยุด${holiday.name} · เปิด${holiday.reopenDayName}`
    : `ปิดทำการ · เปิด ${HOURS_TEXT}`

  return (
    <a
      href={type === "phone" ? `tel:${PHONE_RAW}` : LINE_URL}
      target={type === "line" ? "_blank" : undefined}
      rel={type === "line" ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={`relative ${className}`}
    >
      {children}
      {showClosed && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#14141f] border border-amber-500/30 text-amber-400 text-[11px] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap shadow-xl z-[100] pointer-events-none">
          <svg className="w-3 h-3 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {closedText}
        </span>
      )}
    </a>
  )
}
