"use client"

import { useEffect, useRef, useState } from "react"
import { useAnimationActivity } from "@/hooks/useAnimationActivity"

interface SizeConfig {
  rows: number
  cols: number
  /** Sphere radius as fraction of the panel's SHORTER side. */
  sphereRadius: number
  /** Base dot radius in px (at ambient zones outside the sphere). */
  dotSize: number
  /** Extra radius at sphere center (total = dotSize + dotGrow). */
  dotGrow: number
  /** Hue spread ± around base hue inside the sphere. */
  hueSpread: number
  /** Backdrop blur px, or null to skip the backdrop entirely. */
  backdropBlur: number | null
  /** Dark overlay alpha (ignored when backdropBlur is null). */
  backdropAlpha: number
  /** Saturation (0–100). Lower = softer pastel. */
  saturation: number
  /** Lightness (0–100). */
  lightness: number
  /** Base alpha for ambient dots outside the sphere. */
  ambientAlpha: number
  /** Peak alpha multiplier added inside the sphere. */
  peakAlphaBoost: number
  /** Degrees/sec the base hue drifts over time. 0 = locked to theme color. */
  hueCycleRate: number
}

const LARGE: SizeConfig = {
  rows: 26, cols: 44, sphereRadius: 0.28,
  dotSize: 1.8, dotGrow: 2.4, hueSpread: 30,
  backdropBlur: 18, backdropAlpha: 0.28,
  saturation: 60, lightness: 72,
  ambientAlpha: 0.07, peakAlphaBoost: 0.85,
  hueCycleRate: 6,
}

const SMALL: SizeConfig = {
  rows: 12, cols: 20, sphereRadius: 0.40,
  dotSize: 0.75, dotGrow: 1.2, hueSpread: 20,
  backdropBlur: null, backdropAlpha: 0,
  saturation: 60, lightness: 72,
  ambientAlpha: 0.07, peakAlphaBoost: 0.85,
  hueCycleRate: 6,
}

// Calm, soft, pastel — for section backgrounds where the animation is
// ambient decoration (not a loading state). No backdrop, no dim.
// ambientAlpha=0 → dots outside the cluster are invisible, so there's NO
// visible grid pattern / edge artifact at the canvas boundary; only the
// floating cluster shows.
const AMBIENT: SizeConfig = {
  rows: 32, cols: 56, sphereRadius: 0.14,
  dotSize: 1.1, dotGrow: 3.8, hueSpread: 10,
  backdropBlur: null, backdropAlpha: 0,
  saturation: 48, lightness: 70,
  ambientAlpha: 0, peakAlphaBoost: 0.75,
  hueCycleRate: 0,
}

interface DriftArea {
  /** Fractions 0–1. Defines the sub-rectangle where the sphere CENTER can wander.
   *  Dots still render across the full canvas — only drift is constrained,
   *  so clusters near the edge taper naturally via gaussian falloff. */
  top?: number
  bottom?: number
  left?: number
  right?: number
}

interface Props {
  /** 'large' for hero areas, 'small' for thumbnail grids, 'ambient' for section backdrops. */
  size?: "large" | "small" | "ambient"
  /** Base hue 0–360. Default 220 (blue-violet). 275 = purple, 140 = emerald, 40 = amber. */
  baseHue?: number
  /** Global animation speed. 1 = calm, 2 = lively. Default 2. */
  timeScale?: number
  /** Restrict the sphere-center wander to a sub-rectangle of the canvas.
   *  Default: full area. Dots outside this rect still render (no crop). */
  driftArea?: DriftArea
  /** CSS mix-blend-mode for the canvas. Default 'normal'. */
  blend?: React.CSSProperties["mixBlendMode"]
  /** Delay (ms) after the overlay first enters the viewport before it begins
   *  fading in. Useful for sequencing after a headline/reveal animation.
   *  Default 0 (appears immediately on intersect). */
  startDelay?: number
  /** Opacity transition duration (ms). Default 600. */
  fadeInDuration?: number
}

export default function DriftSphereOverlay({
  size = "large",
  baseHue = 220,
  timeScale = 2,
  driftArea,
  blend = "normal",
  startDelay = 0,
  fadeInDuration = 600,
}: Props) {
  const cfg = size === "small" ? SMALL : size === "ambient" ? AMBIENT : LARGE
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const t0Ref = useRef(0)
  const activityRef = useAnimationActivity(canvasRef)
  const [revealed, setRevealed] = useState(false)

  // Defer reveal until the wrapper first intersects viewport (≥25% visible).
  // Stay revealed after — this is ambient decoration, don't re-trigger on scroll.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setRevealed(true); io.disconnect(); break }
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      const rect = parent!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      canvas!.style.width = "100%"
      canvas!.style.height = "100%"
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    t0Ref.current = performance.now()

    function draw() {
      if (!activityRef.current) { rafRef.current = requestAnimationFrame(draw); return }
      if (canvas!.parentElement !== parent) return

      const rect = parent!.getBoundingClientRect()
      const w = rect.width, h = rect.height
      const shortSide = Math.min(w, h)
      const t = ((performance.now() - t0Ref.current) / 1000) * timeScale

      ctx!.clearRect(0, 0, w, h)

      const rawDriftX = 0.35 * (Math.sin(t * 0.13) + 0.6 * Math.sin(t * 0.071 + 1.2))
      const rawDriftY = 0.30 * (Math.cos(t * 0.17) + 0.6 * Math.sin(t * 0.089 + 2.1))

      // Drift constraint: keep the cluster CENTER inside the sub-rect defined
      // by driftArea (fractions of canvas). Default = full canvas (no change).
      // Dots beyond this box still render via gaussian falloff → natural taper.
      const dLeft = driftArea?.left ?? 0
      const dRight = driftArea?.right ?? 1
      const dTop = driftArea?.top ?? 0
      const dBottom = driftArea?.bottom ?? 1
      const xCenter = (dLeft + dRight) / 2
      const yCenter = (dTop + dBottom) / 2
      const xHalf = (dRight - dLeft) / 2
      const yHalf = (dBottom - dTop) / 2
      // rawDrift amplitudes: X_MAX ≈ 0.56, Y_MAX ≈ 0.48 (0.35*1.6, 0.30*1.6)
      const ox = w * (xCenter + (xHalf / 0.5) * rawDriftX)
      const oy = h * (yCenter + (yHalf / 0.5) * rawDriftY)

      const baseR = shortSide * cfg.sphereRadius
      const r = baseR * (1 + 0.18 * Math.sin(t * 0.6))
      const sigma2 = r * r * 0.5

      // Adaptive grid: preserve the configured total dot count but rebalance
      // rows/cols to match the canvas aspect. Without this, tall-narrow
      // sections (mobile) produce wide row spacing × tight col spacing →
      // the cluster elongates into a horizontal stripe instead of a round
      // blob. Keeps spacing ~uniform on both axes.
      const targetTotal = cfg.rows * cfg.cols
      const cols = Math.max(2, Math.round(Math.sqrt(targetTotal * w / h)))
      const rows = Math.max(2, Math.round(targetTotal / cols))
      const rowSpacing = h / (rows - 1)
      const colSpacing = w / (cols - 1)

      for (let row = 0; row < rows; row++) {
        const y = row * rowSpacing
        for (let col = 0; col < cols; col++) {
          const x = col * colSpacing
          const dx = x - ox, dy = y - oy
          const energy = Math.exp(-(dx * dx + dy * dy) / sigma2)
          const alpha = cfg.ambientAlpha + cfg.peakAlphaBoost * energy
          const radius = cfg.dotSize + energy * cfg.dotGrow
          const hue = (baseHue + energy * cfg.hueSpread + t * cfg.hueCycleRate) % 360
          ctx!.beginPath()
          ctx!.fillStyle = `hsla(${hue}, ${cfg.saturation}%, ${cfg.lightness}%, ${alpha.toFixed(3)})`
          ctx!.arc(x, y, radius, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); observer.disconnect() }
  }, [cfg, activityRef, baseHue, timeScale, driftArea])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: revealed ? 1 : 0,
        transition: `opacity ${fadeInDuration}ms ease-out`,
        transitionDelay: revealed ? `${startDelay}ms` : "0ms",
      }}
    >
      {cfg.backdropAlpha > 0 && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: `rgba(0,0,0,${cfg.backdropAlpha})`,
            ...(cfg.backdropBlur !== null && {
              backdropFilter: `blur(${cfg.backdropBlur}px)`,
              WebkitBackdropFilter: `blur(${cfg.backdropBlur}px)`,
            }),
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: blend }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
