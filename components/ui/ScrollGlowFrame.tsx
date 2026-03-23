"use client"

import { useRef, useEffect, type ReactNode } from "react"

/* ─── Shape presets ─── */
export const SHAPE_PRESETS = {
  // สินค้าใหม่ — modern minimal
  modern: [
    "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4Z",  // Circle ring
    "M12 5L12 19M5 12L19 12",                      // Plus / cross
    "M12 4L19 12L12 20L5 12Z",                      // Rounded diamond
    "M8 8L16 16M16 8L8 16",                          // X sparkle
  ],
  // สินค้าขายดี — cosmic sparkle
  cosmic: [
    "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z", // 4-point star
    "M12 3L13.8 8.2L19 6L15.8 10.8L21 12L15.8 13.2L19 18L13.8 15.8L12 21L10.2 15.8L5 18L8.2 13.2L3 12L8.2 10.8L5 6L10.2 8.2Z", // 6-point star
    "M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6Z M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9Z", // Double ring
    "M6 6L18 6L18 18L6 18Z",                        // Square
    "M12 3L15 10L22 10L16.5 14.5L18.5 21.5L12 17L5.5 21.5L7.5 14.5L2 10L9 10Z", // 5-point star
  ],
  // แลกแต้ม — golden coins & gems
  golden: [
    "M12 2L14.9 8.6L22 9.5L17 14.2L18.2 21.3L12 17.8L5.8 21.3L7 14.2L2 9.5L9.1 8.6Z", // 5-point star (solid)
    "M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6Z",      // Coin circle
    "M12 4L16 12L12 20L8 12Z",                        // Gem diamond
    "M8 4L16 4L20 12L16 20L8 20L4 12Z",              // Hexagon gem
    "M12 2L13.5 9L21 9L15 13.5L17 21L12 16L7 21L9 13.5L3 9L10.5 9Z", // Star burst
  ],
} as const

/* ─── Spawn a single star with finite lifetime ─── */
function spawnOne(
  container: HTMLDivElement,
  r: number,
  g: number,
  b: number,
  shapes: readonly string[] = SHAPE_PRESETS.modern,
) {
  const ns = "http://www.w3.org/2000/svg"
  const size = 6 + Math.random() * 36
  const left = 3 + Math.random() * 94
  const bottom = 5 + Math.random() * 75
  const shape = shapes[Math.floor(Math.random() * shapes.length)]
  const brightness = 0.4 + Math.random() * 0.45
  const rotation = Math.random() * 360
  const duration = 2500 + Math.random() * 2000

  const el = document.createElement("div")
  el.style.cssText = `position:absolute;left:${left}%;bottom:${bottom}%;width:${size}px;height:${size}px;pointer-events:none;`

  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", `rgba(${r},${g},${b},${brightness})`)
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.style.cssText = "width:100%;height:100%"

  const path = document.createElementNS(ns, "path")
  path.setAttribute("d", shape)
  svg.appendChild(path)
  el.appendChild(svg)
  container.appendChild(el)

  const anim = el.animate(
    [
      { transform: `rotate(0deg) scale(0)`, opacity: 0 },
      {
        transform: `rotate(${rotation * 0.15}deg) scale(1.1)`,
        opacity: 0.85,
        offset: 0.12,
      },
      {
        transform: `rotate(${rotation * 0.5}deg) scale(0.95)`,
        opacity: 0.5,
        offset: 0.55,
      },
      { transform: `rotate(${rotation}deg) scale(0)`, opacity: 0 },
    ],
    { duration, easing: "ease-in-out", fill: "forwards" },
  )
  anim.onfinish = () => el.remove()
}

/* ─── ScrollGlowFrame ─── */

export default function ScrollGlowFrame({
  children,
  color = [220, 38, 38],
  offsetTop = 0,
  glowAnchor = 15,
  shapes = SHAPE_PRESETS.modern,
  className = "",
}: {
  children: ReactNode
  color?: [number, number, number]
  offsetTop?: number
  glowAnchor?: number
  shapes?: readonly string[]
  className?: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const borderRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<HTMLDivElement>(null)
  const starsActiveRef = useRef(false)
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spawnCountRef = useRef(0)

  useEffect(() => {
    const el = frameRef.current
    const glow = glowRef.current
    const border = borderRef.current
    if (!el || !glow || !border) return

    let ticking = false
    const [r, g, b] = color

    /* ── Gradual star spawning ── */
    function startSpawning(container: HTMLDivElement) {
      spawnCountRef.current = 0

      function scheduleNext() {
        if (!starsActiveRef.current) return
        // Start slow → speed up: 900ms → 350ms over first 10 spawns
        const n = spawnCountRef.current
        const delay = Math.max(350, 900 - n * 60)
        spawnTimerRef.current = setTimeout(() => {
          if (!starsActiveRef.current) return
          spawnOne(container, r, g, b, shapes)
          spawnCountRef.current++
          scheduleNext()
        }, delay)
      }

      scheduleNext()
    }

    function stopSpawning(container: HTMLDivElement) {
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current)
        spawnTimerRef.current = null
      }
      // Let existing animations finish, then clear
      const kids = Array.from(container.children) as HTMLElement[]
      kids.forEach((kid) => {
        kid.animate([{ opacity: 0 }], { duration: 400, fill: "forwards" })
          .onfinish = () => kid.remove()
      })
    }

    /* ── Scroll handler ── */
    function update() {
      const rect = el!.getBoundingClientRect()
      const vh = window.innerHeight
      const elementCenter = rect.top + rect.height / 2
      const progress = Math.max(0, Math.min(1, 1 - elementCenter / vh))

      const centeredness = 4 * progress * (1 - progress)

      const borderOpacity = 0.10 + centeredness * 0.54
      const bc = `rgba(${r},${g},${b},${borderOpacity})`
      border!.style.borderTopColor = bc
      border!.style.borderLeftColor = bc
      border!.style.borderRightColor = bc

      const drift = (progress - 0.5) * 24
      const glowY = glowAnchor + drift
      const glowOpacity = 0.05 + centeredness * 0.27
      glow!.style.background = `radial-gradient(ellipse 70% 40% at 50% ${glowY}%, rgba(${r},${g},${b},${glowOpacity}), transparent)`

      // Stars: gradual spawn at sweet_spot, fade out when leaving
      const inRange = progress >= 0.2 && progress <= 0.85
      if (inRange && !starsActiveRef.current && starsRef.current) {
        starsActiveRef.current = true
        startSpawning(starsRef.current)
      }
      if (!inRange && starsActiveRef.current && starsRef.current) {
        starsActiveRef.current = false
        stopSpawning(starsRef.current)
      }

      ticking = false
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    update()

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", update)
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    }
  }, [color, glowAnchor, shapes])

  const [r, g, b] = color
  const framePos = { top: `${offsetTop}px`, left: 0, right: 0, bottom: 0 }
  const borderMask =
    "linear-gradient(to bottom, black 0%, black 8%, transparent 25%)"
  const glowMask =
    "linear-gradient(to bottom, black 0%, black 20%, transparent 50%)"

  // Responsive: smaller radius + star zone on mobile
  const radiusDesktop = 24
  const radiusMobile = 16

  return (
    <div ref={frameRef} className={`relative ${className}`}>
      {/* Border — top arc only, fades down sides */}
      <div
        ref={borderRef}
        className="absolute pointer-events-none rounded-t-[16px] md:rounded-t-[24px]"
        style={{
          ...framePos,
          borderStyle: "solid",
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 0,
          borderTopColor: `rgba(${r},${g},${b},0.10)`,
          borderLeftColor: `rgba(${r},${g},${b},0.10)`,
          borderRightColor: `rgba(${r},${g},${b},0.10)`,
          transition: "border-color 0.1s",
          WebkitMaskImage: borderMask,
          maskImage: borderMask,
        }}
      />
      {/* Glow — fades toward bottom */}
      <div
        ref={glowRef}
        className="absolute pointer-events-none overflow-hidden rounded-t-[16px] md:rounded-t-[24px]"
        style={{
          ...framePos,
          WebkitMaskImage: glowMask,
          maskImage: glowMask,
        }}
      />
      {/* Stars — behind content (z-0 < content z-10) */}
      <div
        ref={starsRef}
        className="absolute left-0 right-0 pointer-events-none overflow-hidden rounded-t-[16px] md:rounded-t-[24px] h-[60px] md:h-[140px]"
        style={{
          top: `${offsetTop}px`,
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
