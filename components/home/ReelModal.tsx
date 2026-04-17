"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import type { Reel } from "@/types/reel"

interface Props {
  reels: Reel[]
  startIndex: number
  onClose: () => void
}

const SWIPE_THRESHOLD = 60         // px vertical drag to trigger navigate
const SWIPE_VELOCITY = 0.35        // px/ms — alt trigger (fast flick)
const TAP_MAX_MOVE = 10            // max px movement to register as tap
const TAP_MAX_DURATION = 250       // max ms to register as tap
const SNAP_DURATION = 260          // ms snap animation
const HINT_DURATION = 2800         // ms before swipe hint fades

/**
 * TikTok-style reel viewer — plays preview MP4 directly.
 *
 * Input gestures inside the player area:
 * - Tap       → pause / play toggle
 * - Swipe up  → next reel (loops)
 * - Swipe dn  → prev reel (loops)
 * - Tap outside player (dark area) → close
 * - Esc / ←↑↓→ keys → close / nav
 */
export default function ReelModal({ reels, startIndex, onClose }: Props) {
  const n = reels.length
  const [idx, setIdx] = useState(startIndex)
  const [dragY, setDragY] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showPauseIcon, setShowPauseIcon] = useState<"play" | "pause" | null>(null)
  const [progress, setProgress] = useState(0)
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false)
  const [hintVisible, setHintVisible] = useState(n > 1)

  const activeVideoRef = useRef<HTMLVideoElement | null>(null)
  const prevVideoRef = useRef<HTMLVideoElement | null>(null)
  const nextVideoRef = useRef<HTMLVideoElement | null>(null)

  const prevIdx = (idx - 1 + n) % n
  const nextIdx = (idx + 1) % n
  const reel = reels[idx]
  const prev = n > 1 ? reels[prevIdx] : null
  const next = n > 1 ? reels[nextIdx] : null

  // ─── Body scroll lock ──────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // ─── Hint auto-dismiss ─────────────────────────
  useEffect(() => {
    if (!hintVisible) return
    const t = window.setTimeout(() => setHintVisible(false), HINT_DURATION)
    return () => window.clearTimeout(t)
  }, [hintVisible])

  // ─── Play/pause management + autoplay fallback ─
  useEffect(() => {
    setPaused(false)
    setProgress(0)
    // Pause adjacents
    prevVideoRef.current?.pause()
    nextVideoRef.current?.pause()

    const v = activeVideoRef.current
    if (!v) return
    try { v.currentTime = 0 } catch {}
    const p = v.play()
    if (p && typeof p.catch === "function") {
      p.then(() => setNeedsTapToPlay(false))
       .catch(() => {
         // Browser blocked autoplay (rare for muted). Show tap-to-play.
         setNeedsTapToPlay(true)
       })
    }
  }, [idx])

  // ─── Keyboard nav ──────────────────────────────
  const navLock = useRef(false)
  const goNext = useCallback(() => {
    if (n < 2 || navLock.current) return
    navLock.current = true
    setHintVisible(false)
    triggerHaptic()
    setIsAnimating(true)
    setDragY(-window.innerHeight)
    window.setTimeout(() => {
      setIdx((i) => (i + 1) % n)
      setDragY(0)
      setIsAnimating(false)
      navLock.current = false
    }, SNAP_DURATION)
  }, [n])

  const goPrev = useCallback(() => {
    if (n < 2 || navLock.current) return
    navLock.current = true
    setHintVisible(false)
    triggerHaptic()
    setIsAnimating(true)
    setDragY(window.innerHeight)
    window.setTimeout(() => {
      setIdx((i) => (i - 1 + n) % n)
      setDragY(0)
      setIsAnimating(false)
      navLock.current = false
    }, SNAP_DURATION)
  }, [n])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev()
      else if (e.key === " ") { e.preventDefault(); togglePlayPause() }
    }
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, n])

  // ─── Play/pause toggle ─────────────────────────
  const togglePlayPause = useCallback(() => {
    const v = activeVideoRef.current
    if (!v) return
    if (v.paused) {
      v.play().then(() => {
        setPaused(false)
        setNeedsTapToPlay(false)
        flashIcon("play")
      }).catch(() => {})
    } else {
      v.pause()
      setPaused(true)
      flashIcon("pause")
    }
  }, [])

  const flashIcon = (kind: "play" | "pause") => {
    setShowPauseIcon(kind)
    window.setTimeout(() => setShowPauseIcon(null), 500)
  }

  // ─── Video progress tracking ───────────────────
  useEffect(() => {
    const v = activeVideoRef.current
    if (!v) return
    const update = () => {
      if (v.duration > 0) setProgress((v.currentTime / v.duration) * 100)
    }
    v.addEventListener("timeupdate", update)
    return () => v.removeEventListener("timeupdate", update)
  }, [idx])

  // ─── Swipe / tap handling inside player ───────
  const dragState = useRef<{ startY: number; startX: number; startTime: number; tracking: boolean; pointerId: number }>(
    { startY: 0, startX: 0, startTime: 0, tracking: false, pointerId: -1 }
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isAnimating || navLock.current) return
    // Ignore pointer events on interactive controls (buttons/anchors handled by their onClick)
    if ((e.target as HTMLElement).closest("button,a")) return
    dragState.current = {
      startY: e.clientY,
      startX: e.clientX,
      startTime: Date.now(),
      tracking: true,
      pointerId: e.pointerId,
    }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.tracking || isAnimating) return
    if (e.pointerId !== dragState.current.pointerId) return
    const dy = e.clientY - dragState.current.startY
    const dx = e.clientX - dragState.current.startX
    // If horizontal dominant, don't trigger vertical drag
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 20) return
    setDragY(dy)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.tracking) return
    if (e.pointerId !== dragState.current.pointerId) return
    dragState.current.tracking = false
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}

    const dy = e.clientY - dragState.current.startY
    const dx = e.clientX - dragState.current.startX
    const dt = Math.max(1, Date.now() - dragState.current.startTime)
    const velocity = Math.abs(dy) / dt

    const isTap = Math.abs(dy) < TAP_MAX_MOVE && Math.abs(dx) < TAP_MAX_MOVE && dt < TAP_MAX_DURATION
    if (isTap) {
      // Tap → toggle play/pause
      setDragY(0)
      togglePlayPause()
      return
    }

    const shouldSwipe = Math.abs(dy) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY
    if (shouldSwipe && n > 1) {
      if (dy < 0) goNext()
      else goPrev()
    } else {
      // Snap back
      setIsAnimating(true)
      setDragY(0)
      window.setTimeout(() => setIsAnimating(false), SNAP_DURATION)
    }
  }

  const trackStyle = {
    transform: `translateY(${dragY}px)`,
    transition: isAnimating ? `transform ${SNAP_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none",
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      onClick={onClose}
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Player — centered portrait 9:16. Clicks outside = close (handled by parent). */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-full max-h-screen aspect-[9/16] overflow-hidden touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Vertical track with 3 slides */}
          <div className="absolute inset-0" style={trackStyle}>
            {/* Prev slide */}
            {prev && (
              <div className="absolute inset-0 -translate-y-full">
                <ReelSlide key={`prev-${prev.id}`} reel={prev} videoRef={prevVideoRef} />
              </div>
            )}
            {/* Current slide */}
            <div className="absolute inset-0">
              <ReelSlide key={`curr-${reel.id}`} reel={reel} videoRef={activeVideoRef} />
            </div>
            {/* Next slide */}
            {next && (
              <div className="absolute inset-0 translate-y-full">
                <ReelSlide key={`next-${next.id}`} reel={next} videoRef={nextVideoRef} />
              </div>
            )}
          </div>

          {/* ─── Overlays (fixed, don't move with drag) ───────── */}
          {/* Top gradient + close + position */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-20"
            aria-label="ปิด"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {n > 1 && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/90 text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full z-20 pointer-events-none">
              {idx + 1} / {n}
            </div>
          )}

          {/* Bottom gradient + title + FB button */}
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-4 right-4 flex items-end justify-between gap-3 z-20">
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-bold leading-snug drop-shadow-lg th-text line-clamp-3">
                {reel.title}
              </div>
            </div>
            <a
              href={reel.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 h-10 px-4 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-colors cursor-pointer whitespace-nowrap"
              aria-label="ดูบน Facebook"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.675 0z" />
              </svg>
              เปิด Reel
            </a>
          </div>

          {/* Progress bar (thin, bottom) */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20 pointer-events-none">
            <div
              className="h-full bg-white/70 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Tap feedback icon (pause / play flash) */}
          {showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-[fadeScale_500ms_ease-out]">
                {showPauseIcon === "pause" ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          )}

          {/* Persistent "paused" dim overlay (when explicitly paused) */}
          {paused && !showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/20">
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 text-white translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Tap-to-play fallback (if autoplay blocked) */}
          {needsTapToPlay && !paused && (
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center z-30 bg-black/30 cursor-pointer"
              aria-label="แตะเพื่อเล่น"
            >
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-black translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}

          {/* Swipe hint (auto-dismisses) */}
          {hintVisible && n > 1 && (
            <div className="absolute inset-x-0 top-1/3 flex flex-col items-center pointer-events-none z-20 animate-[fadeIn_300ms_ease-out]">
              <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-full flex items-center gap-2 shadow-xl">
                <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                ปัดขึ้น = คลิปถัดไป
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeScale {
          0%   { opacity: 0.9; transform: scale(0.85); }
          50%  { opacity: 0.75; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── Single slide — poster + <video> ─────────────────────
function ReelSlide({
  reel,
  videoRef,
}: {
  reel: Reel
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
}) {
  return (
    <div className="relative w-full h-full bg-black">
      {/* Poster as fallback — shows until first video frame paints */}
      <Image
        src={reel.poster}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 500px"
        priority
      />
      {reel.previewMp4 && (
        <video
          ref={videoRef}
          src={reel.previewMp4}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          loop
          preload="auto"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// ─── Haptics (no-op on unsupported devices) ─────────────
function triggerHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate(12) } catch {}
  }
}
