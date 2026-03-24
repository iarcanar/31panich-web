"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideAfterDelay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 1500)
  }, [])

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 400) {
        setVisible(true)
        hideAfterDelay()
      } else {
        setVisible(false)
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [hideAfterDelay])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-[8rem] md:bottom-8 right-5 z-40 w-10 h-10 rounded-full bg-[#1a1a28]/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 shadow-lg ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      aria-label="กลับขึ้นบน"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
