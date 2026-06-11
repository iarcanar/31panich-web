"use client"

import { useState, useEffect, useRef, useId, CSSProperties, ReactNode } from "react"

// ─────────────────────────────────────────────────────────────
// LiquidGlass — frosted/refractive glass surface (iOS 27 style)
//
// Port of admin_files/Liquid glass/liquid-glass-ui.jsx (Performance Build),
// re-tinted for the 31panich dark-purple theme.
//
// How it stays cheap (from the reference's perf notes):
//  • The lens displacement map is BAKED to a canvas once per size, not
//    recomputed every frame. The runtime filter is just 2 primitives
//    (feImage + feDisplacementMap).
//  • Lens refraction only runs on Chromium; elsewhere it falls back to a
//    plain frosted blur (GPU path). The design must look complete with
//    frost alone — lens is progressive enhancement.
//
// Project rules layered on top:
//  • lens defaults to FALSE. Only enable it on the 1-2 surfaces the plan
//    budgets for. Everything else uses the .glass-card / .glass-pill CSS.
//  • lens auto-disables below 768px and under prefers-reduced-motion.
//  • The map only re-bakes when WIDTH changes (mobile URL-bar height
//    changes must not thrash the canvas).
// ─────────────────────────────────────────────────────────────

/* ── bake lens map to canvas once (cached by geometry) ── */
const mapCache = new Map<string, string>()

function bakeLensMap(w: number, h: number, r: number, bevel: number, pad: number): string {
  const key = `${w}|${h}|${r}|${bevel}|${pad}`
  const cached = mapCache.get(key)
  if (cached) return cached

  const W = w + pad * 2
  const H = h + pad * 2
  const cv = document.createElement("canvas")
  cv.width = W
  cv.height = H
  const ctx = cv.getContext("2d")!
  const img = ctx.createImageData(W, H)
  const d8 = img.data

  const cx = W / 2, cy = H / 2
  const hw = w / 2, hh = h / 2
  const rr = Math.min(r, hw, hh)

  // signed distance of a rounded-rect (negative = inside)
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - cx) - (hw - rr)
    const qy = Math.abs(y - cy) - (hh - rr)
    const ax = qx > 0 ? qx : 0
    const ay = qy > 0 ? qy : 0
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - rr
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const d = sdf(x, y)
      let rC = 128, gC = 128

      // only the lens-edge band: -bevel < d <= 0
      if (d > -bevel && d <= 0.5) {
        let t = 1 + d / bevel // 0 inner edge → 1 outer edge
        t = t < 0 ? 0 : t > 1 ? 1 : t
        t = t * t * (3 - 2 * t) // smoothstep = soft curved lens surface
        // normal points outward (from gradient of the SDF)
        let nx = sdf(x + 1, y) - sdf(x - 1, y)
        let ny = sdf(x, y + 1) - sdf(x, y - 1)
        const L = Math.hypot(nx, ny) || 1
        nx /= L; ny /= L
        rC = 128 + nx * t * 127
        gC = 128 + ny * t * 127
      }
      d8[i] = rC
      d8[i + 1] = gC
      d8[i + 2] = 0
      d8[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = cv.toDataURL("image/png")
  mapCache.set(key, url)
  return url
}

interface LiquidGlassProps {
  radius?: number
  bevel?: number
  /** Displacement strength. Smaller = smaller filter region = cheaper. */
  strength?: number
  /** Base frost blur in px. */
  frost?: number
  /** Enable lens refraction (Chromium only). Auto-disabled on mobile /
   *  reduced-motion. Defaults to false — most surfaces should stay frosted. */
  lens?: boolean
  /** Glass surface tint (a CSS background value). */
  tint?: string
  /** Override the inset rim + drop shadow. */
  boxShadow?: string
  style?: CSSProperties
  className?: string
  children?: ReactNode
}

const DEFAULT_SHADOW =
  "inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 1.5px 0 rgba(255,255,255,0.34), inset 0 -1px 1px rgba(255,255,255,0.10), 0 22px 55px rgba(20,10,40,0.5)"

export default function LiquidGlass({
  radius = 28,
  bevel = 14,
  strength = 70,
  frost = 1,
  lens = false,
  tint = "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
  boxShadow = DEFAULT_SHADOW,
  style,
  className,
  children,
}: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null)
  const id = "lg" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const [map, setMap] = useState<string | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number; pad: number } | null>(null)
  // Resolved at runtime: lens requested AND device qualifies.
  const [lensActive, setLensActive] = useState(false)

  // Decide whether lens may run: opt-in prop + desktop width + motion-OK.
  useEffect(() => {
    if (!lens) { setLensActive(false); return }
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mqWide = window.matchMedia("(min-width: 768px)")
    const update = () => setLensActive(mqWide.matches && !mqReduce.matches)
    update()
    mqReduce.addEventListener("change", update)
    mqWide.addEventListener("change", update)
    return () => {
      mqReduce.removeEventListener("change", update)
      mqWide.removeEventListener("change", update)
    }
  }, [lens])

  // Bake the displacement map. Re-bake only when WIDTH changes (height-only
  // changes from the mobile URL bar must not thrash the canvas).
  const lastWidth = useRef(0)
  useEffect(() => {
    if (!lensActive) { setMap(null); setDims(null); lastWidth.current = 0; return }
    const el = ref.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(([e]) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = Math.round(e.contentRect.width)
        const h = Math.round(e.contentRect.height)
        if (!w || !h) return
        if (w === lastWidth.current && map) return // width unchanged → keep map
        lastWidth.current = w
        const pad = Math.ceil(strength / 2) + 4
        setDims({ w, h, pad })
        setMap(bakeLensMap(w, h, radius, bevel, pad))
      })
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [lensActive, radius, bevel, strength, map])

  const ready = lensActive && map && dims
  const bf = ready
    ? `url(#${id}) blur(${frost}px) saturate(160%)`
    : `blur(${frost + 9}px) saturate(160%)`

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        borderRadius: radius,
        background: tint,
        backdropFilter: bf,
        WebkitBackdropFilter: bf,
        transform: "translateZ(0)", // own compositing layer
        boxShadow,
        ...style,
      }}
    >
      {ready && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <filter
            id={id}
            x={`${(-dims!.pad / dims!.w) * 100}%`}
            y={`${(-dims!.pad / dims!.h) * 100}%`}
            width={`${100 + (dims!.pad / dims!.w) * 200}%`}
            height={`${100 + (dims!.pad / dims!.h) * 200}%`}
            colorInterpolationFilters="sRGB"
          >
            <feImage href={map!} result="m" preserveAspectRatio="none" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="m"
              scale={-strength}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      {children}
    </div>
  )
}
