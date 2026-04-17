"use client"

import { useEffect, useState } from "react"
import type { Reel } from "@/types/reel"

interface Props {
  reel: Reel
  onClose: () => void
}

/**
 * Modal that embeds a Facebook Reel via the official plugin iframe.
 *
 * Resource strategy:
 * - iframe is mounted only while modal is open — unmounted on close (frees memory)
 * - Uses Facebook's plugins/video.php endpoint (no SDK, no script tag)
 * - `autoplay=true` + `mute=true` (browser policy — audible autoplay is blocked)
 *
 * The "ดูบน Facebook" button tries to deep-link into the installed FB app
 * (fb:// scheme) and falls back to the web URL after ~600ms if no app responds.
 */
export default function ReelModal({ reel, onClose }: Props) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // Build iframe src
  const embedSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
    reel.facebookUrl
  )}&show_text=false&autoplay=true&mute=true&allowfullscreen=true`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6"
      onClick={onClose}
    >
      {/* Player container — 9:16 portrait, capped at viewport */}
      <div
        className="relative w-full max-w-[min(420px,calc(85vh*9/16))] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading skeleton — shown until iframe reports load */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a28]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              <div className="text-xs text-white/50">กำลังโหลด...</div>
            </div>
          </div>
        )}

        {/* FB iframe embed */}
        <iframe
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIframeLoaded(true)}
          title={reel.title}
        />

        {/* Close button — top right */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          aria-label="ปิด"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Floating "ดูบน Facebook" button — bottom right */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            openFacebook(reel.facebookUrl)
          }}
          className="absolute bottom-3 right-3 h-9 px-3 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-colors cursor-pointer z-10"
          aria-label="ดูบน Facebook"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.675 0z" />
          </svg>
          ดูบน Facebook
        </button>

        {/* Title label — bottom left */}
        <div className="absolute bottom-3 left-3 right-28 pointer-events-none">
          <div className="inline-block max-w-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded truncate">
            {reel.title}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Try to open the Facebook app (mobile) for the given reel URL.
 * If FB app isn't installed, browser will navigate to the fallback web URL.
 *
 * Approach: navigate to fb:// scheme, then after ~600ms force the web URL.
 * If the app responds first, the browser's focus change cancels the fallback.
 */
function openFacebook(reelUrl: string) {
  if (typeof window === "undefined") return

  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (!isIOS && !isAndroid) {
    // Desktop — open in new tab
    window.open(reelUrl, "_blank", "noopener,noreferrer")
    return
  }

  // Mobile: attempt app deep link, fallback to web after 600ms
  // fb://facewebmodal is the "safe" universal form — opens URL inside FB app
  const appUrl = `fb://facewebmodal/f?href=${encodeURIComponent(reelUrl)}`
  const fallbackTimer = window.setTimeout(() => {
    window.location.href = reelUrl
  }, 600)

  // If user leaves the page (i.e. app opened), cancel fallback
  const cancel = () => window.clearTimeout(fallbackTimer)
  window.addEventListener("pagehide", cancel, { once: true })
  window.addEventListener("blur", cancel, { once: true })

  window.location.href = appUrl
}
