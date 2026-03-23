"use client"

import { useRef, useEffect } from "react"

/** Short red accent line with bouncy spring reveal on scroll. */
export default function ScrollAccentLine({
  color = [220, 38, 38],
  width = 56,
  threshold = 0.6,
  align = "center",
  offsetLeft = 0,
}: {
  color?: [number, number, number]
  width?: number
  threshold?: number
  align?: "center" | "left"
  offsetLeft?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let ticking = false

    function update() {
      const rect = el!.getBoundingClientRect()
      const show = rect.top < window.innerHeight * threshold
      el!.style.transform = `scaleX(${show ? 1 : 0})`
      el!.style.opacity = show ? "1" : "0"
      ticking = false
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    update()
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  const [r, g, b] = color
  return (
    <div
      ref={ref}
      className={`${align === "center" ? "mx-auto" : ""} mt-1 mb-1 md:mb-4`}
      style={{
        width,
        height: 3,
        borderRadius: 2,
        background: `rgb(${r},${g},${b})`,
        boxShadow: `0 0 14px rgba(${r},${g},${b},0.5)`,
        transform: "scaleX(0)",
        opacity: 0,
        transition:
          "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease",
        ...(align === "left" && offsetLeft ? { marginLeft: offsetLeft } : {}),
        transformOrigin: align === "left" ? "left center" : "center center",
      }}
    />
  )
}
