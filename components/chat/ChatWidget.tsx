"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, LINE_URL } from "@/lib/store-config"
import ChatMessage from "./ChatMessage"

interface Message {
  role: "user" | "assistant"
  text: string
}

const SUGGESTIONS = [
  "มีสินค้าอะไรบ้าง?",
  "ร้านเปิดกี่โมง?",
  "ราคาหลอด LED เท่าไหร่?",
  "มีบริการจัดส่งไหม?",
]

const MIN_HEIGHT = 380
const DEFAULT_HEIGHT = 480

export default function ChatWidget() {
  const router = useRouter()
  const { isOpen: isDuringHours, isMobile } = useBusinessHours()
  const [panelOpen, setPanelOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "สวัสดีครับ! ยินดีต้อนรับสู่ **สามหนึ่งพานิช**\nถามข้อมูลสินค้า ราคา หรือรายละเอียดร้านได้เลยครับ" },
  ])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const [bottomOffset, setBottomOffset] = useState(24) // px from bottom (adjusts for keyboard)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Click-outside → collapse chat
  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    // delay to avoid closing from the same click that opens
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 100)
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick) }
  }, [panelOpen])

  // Adjust panel position when mobile keyboard opens/closes
  useEffect(() => {
    if (!panelOpen || !window.visualViewport) return
    function handleResize() {
      const vv = window.visualViewport!
      // When keyboard is open, viewport height shrinks — move panel up
      const keyboardHeight = window.innerHeight - vv.height
      setBottomOffset(keyboardHeight > 50 ? keyboardHeight + 8 : 24)
      // Also shrink panel to fit visible area
      if (keyboardHeight > 50) {
        const maxH = vv.height - 40
        setPanelHeight((h) => Math.min(h, maxH))
      }
    }
    window.visualViewport.addEventListener("resize", handleResize)
    return () => window.visualViewport?.removeEventListener("resize", handleResize)
  }, [panelOpen])

  // Scroll outside → collapse chat (but not when mobile keyboard opens)
  useEffect(() => {
    if (!panelOpen) return
    function handleScroll(e: Event) {
      // ignore scroll inside the chat panel itself
      if (panelRef.current?.contains(e.target as Node)) return
      // ignore scroll caused by mobile keyboard (input is focused)
      if (panelRef.current?.contains(document.activeElement)) return
      setPanelOpen(false)
    }
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true })
    return () => window.removeEventListener("scroll", handleScroll, { capture: true })
  }, [panelOpen])

  // Resize drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startY = "touches" in e ? e.touches[0].clientY : e.clientY
    const startH = panelHeight

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!isDragging.current) return
      if ("touches" in ev) ev.preventDefault()
      const currentY = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY
      const delta = startY - currentY
      const maxH = window.innerHeight - 32 // 32px margin from top
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
  }, [panelHeight])

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
        setMessages((prev) => [...prev, {
          role: "assistant",
          text: data.reply,
        }])
        // Navigate to search results if products matched
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
      {/* ── Floating button: round chat bubble only ── */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-purple-950 hover:bg-purple-900 text-white shadow-2xl shadow-purple-900/40 border border-purple-400/30 flex items-center justify-center transition-colors"
          aria-label="แชทถาม"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* ── Chat panel: right side ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          style={{ height: panelHeight, bottom: bottomOffset }}
          className="fixed right-3 left-3 md:left-auto md:right-6 z-50 md:w-96 bg-[#14141f] border border-[#2a2a3a] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="flex items-center justify-center h-5 cursor-ns-resize shrink-0 group touch-none"
          >
            <div className="w-8 h-1 rounded-full bg-[#2a2a3a] group-hover:bg-purple-400/50 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white text-sm font-medium">สามหนึ่ง Ai</span>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-gray-500 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contact bar — only during business hours */}
          {isDuringHours && (
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
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} text={msg.text} />
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
              className="flex-1 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-400/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-lg px-3 py-2 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
