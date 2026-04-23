import { useEffect, useRef } from "react"

/**
 * Returns a ref whose `.current` is false when the tab is hidden OR
 * the target element is scrolled offscreen (100px rootMargin keeps the
 * animation warm just above/below the fold).
 */
export function useAnimationActivity<T extends Element>(
  ref: React.RefObject<T | null>,
): React.MutableRefObject<boolean> {
  const activeRef = useRef(true)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    let visible = document.visibilityState !== "hidden"
    let intersecting = true
    const sync = () => { activeRef.current = visible && intersecting }

    const io = new IntersectionObserver(
      ([entry]) => { intersecting = entry.isIntersecting; sync() },
      { threshold: 0, rootMargin: "100px" },
    )
    io.observe(target)

    const onVis = () => { visible = document.visibilityState !== "hidden"; sync() }
    document.addEventListener("visibilitychange", onVis)
    sync()

    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [ref])

  return activeRef
}
