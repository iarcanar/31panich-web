"use client"

import { useEffect, useRef } from "react"
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
}

const LARGE: SizeConfig = {
  rows: 26, cols: 44, sphereRadius: 0.28,
  dotSize: 1.8, dotGrow: 2.4, hueSpread: 30,
  backdropBlur: 18, backdropAlpha: 0.28,
  saturation: 60, lightness: 72,
  ambientAlpha: 0.07, peakAlphaBoost: 0.85,
}

const SMALL: SizeConfig = {
  rows: 12, cols: 20, sphereRadius: 0.40,
  dotSize: 0.75, dotGrow: 1.2, hueSpread: 20,
  backdropBlur: null, backdropAlpha: 0,
  saturation: 60, lightness: 72,
  ambientAlpha: 0.07, peakAlphaBoost: 0.85,
}

// Calm, soft, pastel — for section backgrounds where the animation is
// ambient decoration (not a loading state). No backdrop, no dim.
const AMBIENT: SizeConfig = {
  rows: 22, cols: 38, sphereRadius: 0.42,
  dotSize: 1.1, dotGrow: 1.7, hueSpread: 18,
  backdropBlur: null, backdropAlpha: 0,
  saturation: 45, lightness: 68,
  ambientAlpha: 0.04, peakAlphaBoost: 0.38,
}

interface Props {
  /** 'large' for hero areas, 'small' for thumbnail grids, 'ambient' for section backdrops. */
  size?: "large" | "small" | "ambient"
  /** Base hue 0–360. Default 220 (blue-violet). 275 = purple, 140 = emerald, 40 = amber. */
  baseHue?: number
  /** Global animation speed. 1 = calm, 2 = lively. Default 2. */
  timeScale?: number
}

export default function DriftSphereOverlay({ size = "large", baseHue = 220, timeScale = 2 }: Props) {
  const cfg = size === "small" ? SMALL : size === "ambient" ? AMBIENT : LARGE
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const t0Ref = useRef(0)
  const activityRef = useAnimationActivity(canvasRef)

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

      const driftX = 0.35 * (Math.sin(t * 0.13) + 0.6 * Math.sin(t * 0.071 + 1.2))
      const driftY = 0.30 * (Math.cos(t * 0.17) + 0.6 * Math.sin(t * 0.089 + 2.1))
      const ox = w * (0.5 + driftX)
      const oy = h * (0.5 + driftY)

      const baseR = shortSide * cfg.sphereRadius
      const r = baseR * (1 + 0.18 * Math.sin(t * 0.6))
      const sigma2 = r * r * 0.5

      const rowSpacing = h / (cfg.rows - 1)
      const colSpacing = w / (cfg.cols - 1)

      for (let row = 0; row < cfg.rows; row++) {
        const y = row * rowSpacing
        for (let col = 0; col < cfg.cols; col++) {
          const x = col * colSpacing
          const dx = x - ox, dy = y - oy
          const energy = Math.exp(-(dx * dx + dy * dy) / sigma2)
          const alpha = cfg.ambientAlpha + cfg.peakAlphaBoost * energy
          const radius = cfg.dotSize + energy * cfg.dotGrow
          const hue = (baseHue + energy * cfg.hueSpread + t * 6) % 360
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
  }, [cfg, activityRef, baseHue, timeScale])

  return (
    <>
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
      <div style={{ position: "absolute", inset: 0, isolation: "isolate", pointerEvents: "none" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          aria-hidden="true"
        />
      </div>
    </>
  )
}
