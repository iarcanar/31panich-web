"use client"

import { useEffect } from "react"

/**
 * Site-wide casual deterrent: suppress the right-click context menu when
 * the click target is an <img> element. Text/links stay right-clickable
 * (users can still "Copy link", etc.). DevTools shortcuts (F12) are NOT
 * affected — this is UX polish, not security.
 */
export default function ImageContextGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === "IMG") {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", onContextMenu)
    return () => document.removeEventListener("contextmenu", onContextMenu)
  }, [])
  return null
}
