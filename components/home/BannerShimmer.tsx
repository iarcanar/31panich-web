"use client"

import { useRef, useEffect, useCallback } from "react"

const DURATIONS = [3000, 6000, 8000] // ไว, ช้ามาก, ช้า

export default function BannerShimmer() {
  const ref = useRef<HTMLSpanElement>(null)

  const runSweep = useCallback(() => {
    const el = ref.current
    if (!el) return

    const dur = DURATIONS[Math.floor(Math.random() * DURATIONS.length)]

    const anim = el.animate(
      [
        { transform: "translateX(-120%)" },
        { transform: "translateX(120%)" },
      ],
      { duration: dur, easing: "ease-in-out", fill: "forwards" },
    )

    anim.onfinish = () => runSweep()
  }, [])

  useEffect(() => {
    runSweep()
  }, [runSweep])

  return (
    <span
      ref={ref}
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.25) 35%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 65%, transparent 80%)",
      }}
    />
  )
}
