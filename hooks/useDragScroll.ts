import { useEffect, useState } from "react"

// Toggle to trace pointer/drag events in the browser console.
const DEBUG = false

/** Hard cap on release velocity (px/frame @ 60fps). ~40 = ~2400 px/s. */
const MAX_VELOCITY = 40

interface Options {
  /** px movement threshold — below this counts as a click, not a drag. */
  dragThreshold?: number
  /** Momentum decay per frame (0.9 fast decel … 0.97 long glide). Default 0.94. */
  decay?: number
  /** Stop momentum when |velocity| drops below this (px/frame). Default 0.5. */
  velocityStop?: number
  /** Rolling velocity window (ms). Samples inside this window drive release v. Default 60. */
  velocityWindow?: number
}

/**
 * iOS-style click-hold-drag horizontal scroll for PC (mouse pointers only —
 * touch/pen fall through to the browser's native momentum). Attach the
 * returned `ref` to the scrollable container.
 *
 * While dragging:
 * - temporarily disables `scroll-snap-type` so the drag feels continuous
 * - sets body cursor to `grabbing` and blocks text selection
 *
 * On release:
 * - if movement exceeded `dragThreshold`, a click on any child is suppressed
 *   (prevents accidental navigation after a drag-flick)
 * - applies a momentum decel loop; native snap resumes when momentum stops
 */
export function useDragScroll(
  ref: React.RefObject<HTMLElement | null>,
  options?: Options,
): { isDragging: boolean; isAnimating: boolean; isPressed: boolean } {
  const {
    dragThreshold = 8,
    decay = 0.94,
    velocityStop = 0.5,
    velocityWindow = 60,
  } = options ?? {}

  const [isDragging, setIsDragging] = useState(false)
  // True during active drag OR the post-release momentum loop. Consumers with
  // competing animations (e.g. auto-scroll carousels) should pause while this
  // is true so motion doesn't compound.
  const [isAnimating, setIsAnimating] = useState(false)
  // True from pointerdown to pointerup regardless of whether drag threshold
  // was crossed. Use this to pause auto-scrolling as soon as the user presses,
  // so the cluster doesn't drift under their finger before they've moved.
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      if (DEBUG) console.log("[drag] useEffect: ref.current is null, hook inactive")
      return
    }
    if (DEBUG) console.log("[drag] hook attached to", el.tagName, el.className?.slice(0, 50))

    let active = false
    let dragging = false
    let pointerId = -1
    let startX = 0
    let startScrollLeft = 0
    const samples: Array<{ t: number; x: number }> = []
    let rafId = 0
    let velocity = 0
    let originalSnapType: string | null = null
    let justDraggedUntil = 0

    const pushSample = (t: number, x: number) => {
      samples.push({ t, x })
      while (samples.length > 0 && t - samples[0].t > velocityWindow) samples.shift()
    }

    const computeVelocity = (): number => {
      if (samples.length < 2) return 0
      const first = samples[0]
      const last = samples[samples.length - 1]
      const dt = last.t - first.t
      if (dt <= 0) return 0
      return ((last.x - first.x) / dt) * 16.67 // px/ms → px/frame @ 60fps
    }

    const stopMomentum = () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    }

    const restoreSnap = () => {
      if (originalSnapType !== null) {
        el.style.scrollSnapType = originalSnapType
        originalSnapType = null
      }
    }

    const momentumStep = () => {
      if (Math.abs(velocity) < velocityStop) {
        velocity = 0
        rafId = 0
        restoreSnap()
        setIsAnimating(false)
        return
      }
      el.scrollLeft -= velocity
      velocity *= decay
      rafId = requestAnimationFrame(momentumStep)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        if (DEBUG) console.log("[drag] pointerdown ignored (type=" + e.pointerType + ")")
        return
      }
      // Only the primary button (left-click) should start a drag — otherwise
      // right-click or middle-click would hijack the carousel and break the
      // browser's native context menu / middle-click paste.
      if (e.button !== 0) {
        if (DEBUG) console.log("[drag] pointerdown ignored (button=" + e.button + ")")
        return
      }
      if (DEBUG) console.log("[drag] pointerdown", { x: e.clientX, target: (e.target as Element).tagName })
      // IMPORTANT: do NOT preventDefault or setPointerCapture here.
      //   - preventDefault blocks native image drag (handled via dragstart below)
      //     AND suppresses the click on <a> children → breaks navigation.
      //   - setPointerCapture here routes the synthesized click to the
      //     capturing element (the container div), not the <a>, so pure
      //     clicks never reach the link. Capture happens only AFTER the drag
      //     threshold is crossed, in pointermove.
      stopMomentum()
      restoreSnap()
      active = true
      dragging = false
      pointerId = e.pointerId
      startX = e.clientX
      startScrollLeft = el.scrollLeft
      samples.length = 0
      pushSample(performance.now(), e.clientX)
      document.body.style.cursor = "grabbing"
      setIsPressed(true)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!active) return
      const dx = e.clientX - startX

      if (!dragging && Math.abs(dx) > dragThreshold) {
        dragging = true
        setIsDragging(true)
        setIsAnimating(true)
        originalSnapType = el.style.scrollSnapType || ""
        el.style.scrollSnapType = "none"
        document.body.style.userSelect = "none"
        // Rebase: absorb the threshold distance so the first drag frame does
        // NOT snap the scroll by `threshold` px. From here on, 1px of pointer
        // movement = 1px of scroll, starting from the current resting pos.
        //   invariant: scrollLeft = startScrollLeft - (clientX - startX)
        //   want: at this instant, scrollLeft stays = el.scrollLeft (no jump)
        //   → set startScrollLeft = el.scrollLeft + dx
        startScrollLeft = el.scrollLeft + dx
        try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        if (DEBUG) console.log("[drag] threshold crossed → dragging", { dx })
      }

      if (dragging) {
        // preventDefault only during active drag — kills any native drag/select
        // that might kick in mid-motion. Safe because click has already been
        // ruled out by the threshold.
        e.preventDefault()
        el.scrollLeft = startScrollLeft - dx
        pushSample(performance.now(), e.clientX)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!active) return
      const wasDragging = dragging
      active = false
      dragging = false
      pointerId = -1
      setIsDragging(false)
      setIsPressed(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""

      // Only release if we actually captured (i.e., only after a drag).
      // Releasing when we never captured is harmless but noisy.
      if (wasDragging) {
        try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
        justDraggedUntil = performance.now() + 150
        velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, computeVelocity()))
        if (DEBUG) console.log("[drag] pointerup after drag", { velocity: velocity.toFixed(2) })
        if (Math.abs(velocity) > velocityStop) {
          rafId = requestAnimationFrame(momentumStep)
        } else {
          restoreSnap()
          setIsAnimating(false)
        }
      } else if (DEBUG) {
        console.log("[drag] pointerup without drag (click)")
      }
    }

    // Capture-phase click blocker: if user just finished a drag, swallow the
    // click so child <a>/buttons don't navigate.
    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < justDraggedUntil) {
        if (DEBUG) console.log("[drag] click suppressed (post-drag window)")
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Kill native image drag-and-drop (ghost preview) without blocking clicks.
    // This bubbles from <img> children inside the scroll container.
    const onDragStart = (e: Event) => { e.preventDefault() }

    // Suppress the right-click context menu on the carousel surface — casual
    // deterrent against "Save image as" / "Inspect element" on product media.
    // Does not block DevTools shortcuts; this is UX polish, not security.
    const onContextMenu = (e: Event) => { e.preventDefault() }

    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("pointermove", onPointerMove)
    el.addEventListener("pointerup", onPointerUp)
    el.addEventListener("pointercancel", onPointerUp)
    el.addEventListener("click", onClickCapture, true)
    el.addEventListener("dragstart", onDragStart)
    el.addEventListener("contextmenu", onContextMenu)

    return () => {
      stopMomentum()
      restoreSnap()
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("pointermove", onPointerMove)
      el.removeEventListener("pointerup", onPointerUp)
      el.removeEventListener("pointercancel", onPointerUp)
      el.removeEventListener("click", onClickCapture, true)
      el.removeEventListener("dragstart", onDragStart)
      el.removeEventListener("contextmenu", onContextMenu)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [ref, decay, dragThreshold, velocityStop, velocityWindow])

  return { isDragging, isAnimating, isPressed }
}
