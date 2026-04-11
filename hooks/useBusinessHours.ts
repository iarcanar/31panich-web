import { useState, useEffect } from "react"

interface ActiveHoliday {
  name: string
  closedFrom: string
  closedTo: string
  reopenDate: string
  reopenDayName: string
  greeting: string
}

export function useBusinessHours() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [holiday, setHoliday] = useState<ActiveHoliday | null>(null)

  useEffect(() => {
    function checkHours() {
      const now = new Date()
      const th = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
      const mins = th.getHours() * 60 + th.getMinutes()
      setIsOpen(mins >= 450 && mins <= 1050) // 7:30–17:30
    }
    checkHours()
    const iv = setInterval(checkHours, 60000)

    const mq = window.matchMedia("(max-width: 768px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)

    // Fetch active holiday (cached 5 min server-side via ISR)
    fetch("/api/holidays/active")
      .then((r) => r.json())
      .then((data) => { if (data.holiday) setHoliday(data.holiday) })
      .catch(() => {})

    return () => { clearInterval(iv); mq.removeEventListener("change", handler) }
  }, [])

  // If holiday is active, override isOpen to false
  const isHoliday = holiday !== null
  const effectiveOpen = isHoliday ? false : isOpen

  return { isOpen: effectiveOpen, isMobile, holiday, isHoliday }
}
