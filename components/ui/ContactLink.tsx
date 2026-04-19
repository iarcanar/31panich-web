"use client"

import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, LINE_URL, HOURS_TEXT } from "@/lib/store-config"
import { fmtShort, holidayShortName } from "@/lib/date-utils"

interface Props {
  type: "phone" | "line"
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  /** When closed, also render a visible hours pill next to the label.
   *  Default `false` (just disable click + opacity-50 to avoid clutter —
   *  the site has several ContactLinks per page and showing the pill on
   *  every one was noisy). Enable only on primary CTAs (e.g. homepage hero). */
  showHoursWhenClosed?: boolean
}

export default function ContactLink({
  type,
  children,
  className = "",
  onClick,
  showHoursWhenClosed = false,
}: Props) {
  const { isOpen, holiday, isHoliday } = useBusinessHours()

  const closedText = isHoliday && holiday
    ? `หยุด${holidayShortName(holiday.name)} · เปิด ${fmtShort(holiday.reopenDate)}`
    : `เปิด ${HOURS_TEXT}`

  // ─── Closed: verbose variant (opt-in, for primary CTAs only) ───────
  if (!isOpen && showHoursWhenClosed) {
    return (
      <span
        className={`relative inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed select-none ${className}`}
        aria-disabled="true"
      >
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

  // ─── Closed: minimal variant (default) ─────────────────────────────
  // Same visual as the open button but with opacity-50 + cursor-not-allowed.
  // The full hours text is in `title` for hover/long-press tooltip + screen
  // readers via `aria-label`. Keeps the page calm — hours info is already
  // surfaced on the hero CTA and the chat widget.
  if (!isOpen) {
    return (
      <span
        className={`${className} opacity-50 cursor-not-allowed select-none`}
        aria-disabled="true"
        aria-label={`${typeof children === "string" ? children : ""} — ${closedText}`}
        title={closedText}
      >
        {children}
      </span>
    )
  }

  // ─── Open: live link ───────────────────────────────────────────────
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
