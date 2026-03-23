import { useState, useEffect } from "react"

export function useBusinessHours() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

    return () => { clearInterval(iv); mq.removeEventListener("change", handler) }
  }, [])

  return { isOpen, isMobile }
}
