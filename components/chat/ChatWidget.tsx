"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, LINE_URL, GOOGLE_MAPS_URL } from "@/lib/store-config"
import ChatMessage from "./ChatMessage"
import { fmtShort, holidayShortName } from "@/lib/date-utils"

interface Message {
  role: "user" | "assistant"
  text: string
  /** AI-emitted product suggestion — rendered as a tappable "ดูสินค้า X"
   *  button below the bubble for one-click search without typing a reply. */
  suggestion?: { keyword: string }
  /** AI flagged this message as location-related — render a Google Maps
   *  button below the bubble for one-tap directions. */
  mapLink?: boolean
}

const SUGGESTIONS = [
  "มีสินค้าอะไรบ้าง?",
  "ร้านเปิดกี่โมง?",
  "ราคาหลอด LED เท่าไหร่?",
  "มีบริการจัดส่งไหม?",
  "ร้านอยู่แถวไหน?",
  "มีที่จอดรถมั้ย?",
]

const MIN_HEIGHT = 380
const DEFAULT_HEIGHT = 480
// Bumped suffix to reset any stale preference from prior testing. Ensures
// EVERY user starts with TTS = ON after this deploy, regardless of what they
// toggled before. They can turn it off via the toggle; the new choice will
// persist under this key going forward.
const TTS_PREF_KEY = "chat-tts-enabled-v2"

export default function ChatWidget() {
  const router = useRouter()
  const { isOpen: isDuringHours, isMobile, holiday, isHoliday } = useBusinessHours()
  const [panelOpen, setPanelOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "สวัสดีครับ! ยินดีต้อนรับสู่ **สามหนึ่งพานิช**\nถามข้อมูลสินค้า ราคา หรือรายละเอียดร้านได้เลยครับ" },
  ])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const panelHeightRef = useRef(DEFAULT_HEIGHT)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // ── TTS state ──
  // Global on/off for auto-speaking new AI replies (persisted in localStorage).
  const [ttsEnabled, setTtsEnabled] = useState(true)
  // Which message index is currently fetching / playing audio (by message array index).
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState<number | null>(null)
  const [ttsPlayingIdx, setTtsPlayingIdx] = useState<number | null>(null)
  // Cache of generated audio URLs per message index — survives panel close/reopen.
  const audioCache = useRef<Map<number, string>>(new Map())
  // Deduplicate concurrent fetches for the same index (prevents double-call from
  // React strict mode re-invocations or rapid replay clicks during fetch).
  const inFlightFetches = useRef<Set<number>>(new Set())
  const currentAudio = useRef<HTMLAudioElement | null>(null)
  const ttsEnabledRef = useRef(true)
  ttsEnabledRef.current = ttsEnabled
  // When the next assistant reply arrives, auto-play this text (cleared after).
  // Kept as a ref (not state) so it survives strict-mode updater double-invocation
  // without triggering duplicate TTS calls.
  const pendingAutoPlayRef = useRef<string | null>(null)

  // Load TTS preference
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem(TTS_PREF_KEY)
      if (saved !== null) setTtsEnabled(saved === "true")
    } catch {}
  }, [])

  // Persist TTS preference
  useEffect(() => {
    try { window.localStorage.setItem(TTS_PREF_KEY, String(ttsEnabled)) } catch {}
  }, [ttsEnabled])

  // Stop any active audio when panel closes
  useEffect(() => {
    if (!panelOpen && currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
      setTtsPlayingIdx(null)
    }
  }, [panelOpen])

  // Free cached blob URLs on unmount
  useEffect(() => {
    const cache = audioCache.current
    return () => {
      cache.forEach((url) => { try { URL.revokeObjectURL(url) } catch {} })
      cache.clear()
    }
  }, [])

  /** Pre-fetch TTS audio and store in cache. Returns true on success.
   *  Used when `ttsEnabled` so we can delay rendering the bot message until
   *  audio is ready — keeps text + voice appearing in sync. */
  const prefetchTTS = useCallback(async (idx: number, text: string): Promise<boolean> => {
    if (audioCache.current.has(idx)) return true
    if (inFlightFetches.current.has(idx)) return false
    inFlightFetches.current.add(idx)
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return false
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioCache.current.set(idx, url)
      return true
    } catch {
      return false
    } finally {
      inFlightFetches.current.delete(idx)
    }
  }, [])

  /** Play TTS for the message at the given index. Uses cache when possible.
   *  Deduplicates concurrent fetches (e.g. double-invocation in strict mode or
   *  rapid replay clicks) so the API is hit at most once per unique message. */
  const playTTS = useCallback(async (idx: number, text: string) => {
    // Stop any currently playing audio
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }

    // 1) Cache hit → play immediately
    const cachedUrl = audioCache.current.get(idx)
    if (cachedUrl) {
      const audio = new Audio(cachedUrl)
      currentAudio.current = audio
      setTtsPlayingIdx(idx)
      audio.onended = () => { if (currentAudio.current === audio) { currentAudio.current = null; setTtsPlayingIdx(null) } }
      audio.onerror = () => setTtsPlayingIdx(null)
      try { await audio.play() } catch { setTtsPlayingIdx(null) }
      return
    }

    // 2) Already fetching for this index → skip duplicate request
    if (inFlightFetches.current.has(idx)) return

    // 3) Fetch + cache + play
    inFlightFetches.current.add(idx)
    setTtsLoadingIdx(idx)
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioCache.current.set(idx, url)

      const audio = new Audio(url)
      currentAudio.current = audio
      setTtsLoadingIdx(null)
      setTtsPlayingIdx(idx)
      audio.onended = () => { if (currentAudio.current === audio) { currentAudio.current = null; setTtsPlayingIdx(null) } }
      audio.onerror = () => { setTtsPlayingIdx(null) }
      await audio.play().catch(() => setTtsPlayingIdx(null))
    } catch {
      setTtsLoadingIdx(null)
      // silent fail — don't interrupt chat
    } finally {
      inFlightFetches.current.delete(idx)
    }
  }, [])

  // Watch for a new assistant message flagged for auto-play. Running this in a
  // useEffect (rather than in the setMessages updater) avoids double-firing when
  // React strict mode invokes functional updaters twice in dev.
  useEffect(() => {
    const pending = pendingAutoPlayRef.current
    if (!pending) return
    const lastIdx = messages.length - 1
    const last = messages[lastIdx]
    if (!last || last.role !== "assistant" || last.text !== pending) return
    pendingAutoPlayRef.current = null
    if (!ttsEnabledRef.current) return
    playTTS(lastIdx, last.text)
  }, [messages, playTTS])

  // Keep ref in sync — keyboard handler reads from ref, not state
  panelHeightRef.current = panelHeight

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (panelOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, panelOpen])

  // Lock body scroll when chat panel is open (prevents scroll-through on mobile)
  useEffect(() => {
    if (!panelOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [panelOpen])

  // Click-outside → collapse chat
  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 200)
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick) }
  }, [panelOpen])

  // Keyboard handling is now done entirely via CSS `dvh` (dynamic viewport
  // height) units on the panel — the browser auto-shrinks the max-height
  // when the keyboard opens on BOTH iOS and Android (unlike the previous
  // JS-based math which only worked correctly on iOS). See the panel's
  // `maxHeight` style + `bottom-6` class below.

  // Resize drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startY = "touches" in e ? e.touches[0].clientY : e.clientY
    const startH = panelHeightRef.current

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!isDragging.current) return
      if ("touches" in ev) ev.preventDefault()
      const currentY = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY
      const delta = startY - currentY
      const maxH = window.innerHeight - 32
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(maxH, startH + delta)))
    }
    function onEnd() {
      isDragging.current = false
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onEnd)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onEnd)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onEnd)
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onEnd)
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text }])
    setLoading(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      })
      const data = await res.json()
      if (data.queued) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.message }])
      } else if (data.reply) {
        if (data.sessionId) setSessionId(data.sessionId)

        // The next message's index = current messages array length.
        // We read it BEFORE any setMessages call so pre-fetch can target it.
        const nextIdx = messages.length + 1 // +1 because user msg was just pushed

        if (ttsEnabledRef.current) {
          // TTS ON → fetch audio first, then reveal text+audio together.
          // User sees loading dots a bit longer but text & voice arrive in sync.
          pendingAutoPlayRef.current = data.reply
          await prefetchTTS(nextIdx, data.reply)
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            text: data.reply,
            suggestion: data.suggestion,
            mapLink: data.mapLink,
          },
        ])

        if (data.searchQuery) {
          router.push(`/products?search=${encodeURIComponent(data.searchQuery)}`)
        }
      } else if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "ขออภัยครับ เกิดข้อผิดพลาด กรุณาลองใหม่" }])
    } finally {
      setLoading(false)
    }
  }

  // ── Scroll fade: transparent while scrolling, solid when idle ──
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      setIsScrolling(true)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setIsScrolling(false), 600)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  // ── Random wiggle: subtle nudge at random intervals ──
  const [wiggle, setWiggle] = useState(false)
  const delays = useMemo(() => [6000, 10000, 15000], [])

  useEffect(() => {
    if (panelOpen) return
    let timer: ReturnType<typeof setTimeout>
    function scheduleWiggle() {
      const delay = delays[Math.floor(Math.random() * delays.length)]
      timer = setTimeout(() => {
        setWiggle(true)
        setTimeout(() => setWiggle(false), 600)
        scheduleWiggle()
      }, delay)
    }
    scheduleWiggle()
    return () => clearTimeout(timer)
  }, [panelOpen, delays])

  const showSuggestions = messages.length === 1

  function handlePhoneClick() {
    if (isMobile) {
      window.location.href = `tel:${PHONE_RAW}`
    } else {
      window.open(`tel:${PHONE_RAW}`)
    }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setPanelOpen(true)}
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        className={`fixed right-4 z-50 rounded-full shadow-2xl shadow-purple-900/50 border-2 border-purple-400/60 bg-purple-950/90 hover:bg-purple-900 backdrop-blur-sm flex items-center gap-2 px-4 py-2.5 transition-all duration-500 ${
          panelOpen ? "opacity-0 pointer-events-none scale-75" : ""
        } ${isScrolling ? "opacity-30" : "opacity-100"} ${wiggle ? "animate-[wiggle_0.5s_ease-in-out]" : ""}`}
        aria-label="เปิดแชท AI"
      >
        <span className="text-white text-sm font-medium whitespace-nowrap">สอบถาม</span>
        <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* ── Chat panel (always in DOM — CSS visibility toggle) ──
           Positioning:
             - bottom: safe-area + 24px from visible viewport bottom
             - height: user-draggable (state) but clamped by max-height
             - max-height: 100dvh - 3rem (dvh = dynamic viewport, shrinks
               automatically when the keyboard opens on iOS AND Android —
               replaces the old JS-based visualViewport math that only
               worked on iOS) */}
      <div
        ref={panelRef}
        style={{
          height: panelHeight,
          maxHeight: "calc(100dvh - 3rem)",
          bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        className={`fixed right-3 left-3 md:left-auto md:right-6 z-50 md:w-96 max-w-[calc(100vw-1.5rem)] md:max-w-none bg-[#14141f] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
          panelOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none translate-y-3"
        }`}
      >
        {/* Resize handle — with small tucked-away close X at top-right corner */}
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className="flex items-center justify-center h-5 cursor-ns-resize shrink-0 group touch-none relative"
        >
          <div className="w-8 h-1 rounded-full bg-[#2a2a3a] group-hover:bg-purple-400/50 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); setPanelOpen(false) }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="ปิดแชท"
            title="ปิด"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#2a2a3a]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 self-start mt-1.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-white text-sm font-medium block">สามหนึ่ง Ai</span>
              <p className="text-[9px] text-gray-500 leading-tight truncate">Gemini 2.5 Flash · AI อาจผิดพลาดได้</p>
            </div>
          </div>

          {/* Prominent TTS toggle — clear label for all ages */}
          <button
            onClick={() => {
              if (ttsEnabled && currentAudio.current) {
                currentAudio.current.pause()
                currentAudio.current = null
                setTtsPlayingIdx(null)
              }
              setTtsEnabled((v) => !v)
            }}
            className={`shrink-0 h-8 pl-2 pr-3 rounded-full flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
              ttsEnabled
                ? "bg-emerald-500/15 border-emerald-400/50 hover:bg-emerald-500/25 hover:border-emerald-400/70"
                : "bg-white/5 border-white/15 hover:bg-white/10"
            }`}
            title={ttsEnabled ? "แตะเพื่อปิดเสียงอ่านอัตโนมัติ" : "แตะเพื่อเปิดเสียงอ่านอัตโนมัติ"}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? "ปิดเสียง AI" : "เปิดเสียง AI"}
          >
            {ttsEnabled ? (
              <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14l-1.42-1.42a8 8 0 000-11.3l1.42-1.42zM15.54 8.46a5 5 0 010 7.07l-1.41-1.41a3 3 0 000-4.24l1.41-1.42z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path fillRule="evenodd" d="M16.47 8.47a.75.75 0 011.06 0L19 9.94l1.47-1.47a.75.75 0 111.06 1.06L20.06 11l1.47 1.47a.75.75 0 11-1.06 1.06L19 12.06l-1.47 1.47a.75.75 0 01-1.06-1.06L17.94 11l-1.47-1.47a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            )}
            <span className={`font-extrabold text-sm leading-none ${ttsEnabled ? "text-emerald-300" : "text-red-300"}`}>
              {ttsEnabled ? "เปิด" : "ปิด"}
            </span>
            {/* Secondary label — hidden on very narrow screens (iPhone SE class)
                so the button fits without truncation in the chat header row. */}
            <span className="text-white/70 text-xs leading-none hidden min-[360px]:inline">เสียงพูด</span>
          </button>
        </div>

        {/* Contact bar */}
        <div className="flex border-b border-[#2a2a3a]">
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            ติดต่อ Line
          </a>
          {isDuringHours ? (
            <>
              <div className="w-px bg-[#2a2a3a]" />
              <button
                onClick={handlePhoneClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-emerald-400 hover:bg-emerald-400/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                โทรสายด่วน
              </button>
            </>
          ) : (
            <>
              <div className="w-px bg-[#2a2a3a]" />
              <div className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium text-amber-400/70">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isHoliday && holiday ? `หยุด${holidayShortName(holiday.name)} · เปิด ${fmtShort(holiday.reopenDate)}` : "นอกเวลาทำการ"}
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
          {messages.map((msg, i) => (
            <div key={i} className="space-y-1.5">
              <ChatMessage
                role={msg.role}
                text={msg.text}
                onReplay={msg.role === "assistant" ? () => playTTS(i, msg.text) : undefined}
                ttsLoading={ttsLoadingIdx === i}
                ttsPlaying={ttsPlayingIdx === i}
              />
              {msg.suggestion && (
                <div className="flex justify-start">
                  <button
                    onClick={() => {
                      setPanelOpen(false)
                      router.push(`/products?search=${encodeURIComponent(msg.suggestion!.keyword)}`)
                    }}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-lg shadow-purple-500/30 active:scale-95 transition-all"
                    aria-label={`ค้นหาสินค้า ${msg.suggestion.keyword}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                    ดูสินค้า {msg.suggestion.keyword}
                    <svg className="w-3.5 h-3.5 -mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              {msg.mapLink && (
                <div className="flex justify-start">
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
                    aria-label="เปิด Google Maps เพื่อนำทางไปร้าน"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                    นำทางไปร้าน
                    <svg className="w-3.5 h-3.5 -mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ))}

          {showSuggestions && !loading && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-400/20 rounded-full px-3 py-1.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-400 rounded-2xl rounded-bl-md px-3 py-2 text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex items-center gap-2 px-3 py-2.5 border-t border-[#2a2a3a]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            maxLength={500}
            className="flex-1 min-w-0 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg px-3 py-2 text-base md:text-sm text-white placeholder-gray-600 outline-none focus:border-purple-400/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-lg px-3 py-2 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
