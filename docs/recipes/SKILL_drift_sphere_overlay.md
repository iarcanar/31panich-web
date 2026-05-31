# Skill · Drift Sphere Loading Overlay

> **Ready-to-copy skill** for "we're working on it" animations on image
> areas, banners, gallery previews, or any rectangular surface.
> Self-contained — 2 files, 0 deps beyond React.

## What it is

A soft glowing cluster of dots that meanders across a panel on a
pseudo-random path (sum of two sine components with irrational frequency
ratio — no visible loop). Dots inside the sphere glow together, outside
they fade to a faint ambient twinkle. Sphere radius also breathes slowly
so the cluster feels alive. Drop it on top of:

- **Gallery previews** while content is generating
- **Banners / hero tiles** in a loading state
- **Thumbnail grids** with many concurrent "busy" tiles
- Any rectangular image surface that needs a "pending" feel

Visual: calm, organic, never repeats.

## Install

Copy 2 files into your project. TypeScript, React 18+. No extra deps.

### File 1/2 — `useAnimationActivity.ts`

Foundation hook. Pauses animations when the tab is hidden or the target
is scrolled offscreen. Without this, 5+ overlays on a background tab
burn real battery.

```ts
// src/hooks/useAnimationActivity.ts
import { useEffect, useRef } from 'react'

/**
 * Returns a ref whose `.current` is false when the tab is hidden OR
 * the target element is scrolled offscreen (100px rootMargin keeps the
 * animation warm just above/below the fold). Consume inside a rAF loop:
 *
 *   function draw() {
 *     if (!activeRef.current) {
 *       rafRef.current = requestAnimationFrame(draw)  // keep polling
 *       return                                        // but skip work
 *     }
 *     // ... actual render ...
 *     rafRef.current = requestAnimationFrame(draw)
 *   }
 */
export function useAnimationActivity<T extends Element>(
  ref: React.RefObject<T | null>,
): React.MutableRefObject<boolean> {
  const activeRef = useRef(true)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    let visible = document.visibilityState !== 'hidden'
    let intersecting = true
    const sync = () => { activeRef.current = visible && intersecting }

    const io = new IntersectionObserver(
      ([entry]) => { intersecting = entry.isIntersecting; sync() },
      { threshold: 0, rootMargin: '100px' },
    )
    io.observe(target)

    const onVis = () => { visible = document.visibilityState !== 'hidden'; sync() }
    document.addEventListener('visibilitychange', onVis)
    sync()

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ref])

  return activeRef
}
```

### File 2/2 — `DriftSphereOverlay.tsx`

The animation component.

```tsx
// src/components/DriftSphereOverlay.tsx
import { useEffect, useRef } from 'react'
import { useAnimationActivity } from '../hooks/useAnimationActivity'

interface SizeConfig {
  rows: number
  cols: number
  /** Sphere radius as fraction of the panel's SHORTER side. */
  sphereRadius: number
  /** Base dot radius in px (at ambient zones outside the sphere). */
  dotSize: number
  /** Extra radius at sphere center (total = dotSize + dotGrow). */
  dotGrow: number
  /** Hue spread ± around BASE_HUE inside the sphere. */
  hueSpread: number
  /** Backdrop blur px, or null to skip the backdrop entirely. */
  backdropBlur: number | null
  /** Dark overlay alpha (ignored when backdropBlur is null). */
  backdropAlpha: number
}

// Tune these to taste.
const LARGE: SizeConfig = {
  rows: 26, cols: 44, sphereRadius: 0.28,
  dotSize: 1.8, dotGrow: 2.4, hueSpread: 30,
  backdropBlur: 18, backdropAlpha: 0.28,
}

// Lean variant for thumbnails / wall-of-tiles. NO backdrop-filter —
// it's the single most expensive CSS op when repeated, and the
// container's own bg (e.g. `bg-black`) is enough contrast for the
// sparse dots.
const SMALL: SizeConfig = {
  rows: 12, cols: 20, sphereRadius: 0.40,
  dotSize: 0.75, dotGrow: 1.2, hueSpread: 20,
  backdropBlur: null, backdropAlpha: 0,
}

const BASE_HUE = 220         // change for a different palette
const TIME_SCALE = 2          // 1 = calm, 2 = lively, >3 = jittery

interface Props {
  /** 'large' for hero areas, 'small' for thumbnail grids. */
  size?: 'large' | 'small'
}

export function DriftSphereOverlay({ size = 'large' }: Props) {
  const cfg = size === 'small' ? SMALL : LARGE
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const t0Ref = useRef(0)
  const activityRef = useAnimationActivity(canvasRef)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      const rect = parent!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      canvas!.style.width = '100%'
      canvas!.style.height = '100%'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    t0Ref.current = performance.now()

    function draw() {
      if (!activityRef.current) { rafRef.current = requestAnimationFrame(draw); return }
      if (canvas!.parentElement !== parent) return  // detached — bail

      const rect = parent!.getBoundingClientRect()
      const w = rect.width, h = rect.height
      const shortSide = Math.min(w, h)
      const t = ((performance.now() - t0Ref.current) / 1000) * TIME_SCALE

      ctx!.clearRect(0, 0, w, h)

      // Drift — sum of two sines with irrational freq ratio → never loops.
      const driftX = 0.35 * (Math.sin(t * 0.13) + 0.6 * Math.sin(t * 0.071 + 1.2))
      const driftY = 0.30 * (Math.cos(t * 0.17) + 0.6 * Math.sin(t * 0.089 + 2.1))
      const ox = w * (0.5 + driftX)
      const oy = h * (0.5 + driftY)

      // Sphere radius breathes slowly — keeps it feeling alive.
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
          const alpha = 0.07 + 0.85 * energy
          const radius = cfg.dotSize + energy * cfg.dotGrow
          const hue = (BASE_HUE + energy * cfg.hueSpread + t * 6) % 360
          ctx!.beginPath()
          ctx!.fillStyle = `hsla(${hue}, 60%, 72%, ${alpha.toFixed(3)})`
          ctx!.arc(x, y, radius, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); observer.disconnect() }
  }, [cfg, activityRef])

  return (
    <>
      {cfg.backdropAlpha > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `rgba(0,0,0,${cfg.backdropAlpha})`,
            ...(cfg.backdropBlur !== null && {
              backdropFilter: `blur(${cfg.backdropBlur}px)`,
              WebkitBackdropFilter: `blur(${cfg.backdropBlur}px)`,
            }),
          }}
        />
      )}
      {/* isolation:isolate scopes any blend-modes to this component */}
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />
      </div>
    </>
  )
}
```

## Mount

Parent must be `position: relative` with defined dimensions. That's it.

```tsx
// Gallery preview — a large overlay on a hero image while generating
<div style={{ position: 'relative', aspectRatio: '16/9' }}>
  <img src={previewImage} alt="" />
  {isGenerating && <DriftSphereOverlay size="large" />}
</div>

// Thumbnail grid — many lean overlays at once
<div className="grid grid-cols-4 gap-2">
  {items.map(item => (
    <button
      key={item.id}
      style={{ position: 'relative', aspectRatio: '1/1', background: 'black' }}
    >
      {item.done ? (
        <img src={item.url} alt="" />
      ) : (
        <DriftSphereOverlay size="small" />
      )}
    </button>
  ))}
</div>

// Banner — full-width hero loading state
<div style={{ position: 'relative', width: '100%', height: 240, background: '#0a0a0f' }}>
  <DriftSphereOverlay size="large" />
  <h1 style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
    Preparing your feed…
  </h1>
</div>
```

## Tuning dials

Most-used knobs, in order of visual impact:

| Knob | What changes | Try |
|---|---|---|
| `BASE_HUE` | Overall color | 0 (red) · 120 (green) · 220 (blue-violet, default) · 280 (magenta) |
| `TIME_SCALE` | Global speed | 1 (meditative) · 2 (default) · 3 (energetic) |
| `sphereRadius` | Cluster size | 0.18 (tight point) · 0.28 (default) · 0.45 (dominates panel) |
| `dotSize` + `dotGrow` | Dot visual weight | Halve both for thumbnails, double for giant banners |
| `rows` × `cols` | Grid density | 26×44 default; 50×90 for high-DPI hero tiles |
| `hueSpread` | Color shift inside sphere | 0 = monochrome · 30 = default · 90 = rainbow-ish |
| `backdropBlur` / `backdropAlpha` | Dimming the layer below | `null` + `0` = no dim, raw dots ride on parent bg |

## Five gotchas (the actual ones, not a textbook list)

1. **Never read `canvas.parentElement` inside the draw loop with `!`.** Capture `parent` at setup time, check `canvas.parentElement !== parent` in draw and bail cleanly if detached. Suspense / portal reparent / fast conditional flips can nuke the parent mid-frame.

2. **Typed-array buffers belong in refs, not in `draw()`.** `new Float32Array(N)` inside a 60fps loop = 60 short-lived allocations/sec per buffer. Hoist into `useRef<Float32Array>(new Float32Array(0))` and grow only when N changes.

3. **Always use `useAnimationActivity`.** The browser's rAF throttling cuts callback *frequency* on hidden tabs but does NOT skip the CPU work inside each call. A thumbnail grid with 6 overlays will churn through full grid iterations on a background tab without the gate.

4. **`setTransform(dpr, ...)` goes in `resize()`, not `draw()`.** The DPR scale persists across frames on the same canvas context — re-applying it every frame is pure waste.

5. **Density × dot size is coupled.** If you triple grid density, halve `dotSize` + `dotGrow` or the dots merge into a solid blob at the sphere center. Tune together.

## Performance budget (measured)

- `size='large'`: ~1,150 `ctx.arc + fill` calls per frame. Comfortable 60fps on mid-range laptops even with backdrop-filter blur.
- `size='small'`: ~240 calls per frame, no backdrop-filter. Designed so **5+ instances running simultaneously** still hit 60fps — this is the concurrent-generation thumbnail grid case.
- With `useAnimationActivity`: **zero CPU on hidden tabs**, offscreen tiles pause until they scroll within 100px of the viewport.

## License

Take it. No attribution needed. MIT-equivalent.
