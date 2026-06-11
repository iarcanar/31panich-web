"use client"

import { ReactNode } from "react"

interface Props {
  role: "user" | "assistant"
  text: string
  /** Click handler for the bubble-top speaker button. Only rendered for
   *  assistant messages. Omit to hide the button (e.g. for system errors). */
  onReplay?: () => void
  /** Currently fetching TTS audio for this message. */
  ttsLoading?: boolean
  /** TTS audio for this message is currently playing. */
  ttsPlaying?: boolean
}

import { LINE_URL } from "@/lib/store-config"

/** Parse text and convert phone numbers, LINE ID, and URLs into clickable links */
function parseLinks(text: string): ReactNode[] {
  // Match: phone numbers, @31PANICH, URLs, or **bold**
  const pattern = /(0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4})|(@31PANICH)|(https?:\/\/\S+)|(\*\*[^*]+\*\*)/gi
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const matched = match[0]

    if (match[4]) {
      // **Bold text**
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {matched.slice(2, -2)}
        </strong>
      )
    } else if (match[2]) {
      // LINE ID → green button with LINE icon
      parts.push(
        <a
          key={match.index}
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b34d] text-white font-semibold text-xs px-3 py-1.5 rounded-full transition-colors mx-0.5 align-middle"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          แชท Line
        </a>
      )
    } else if (match[3]) {
      // URL → if it's a LINE URL, redirect to our correct LINE link, otherwise render as-is
      const isLineUrl = matched.toLowerCase().includes("line.me")
      parts.push(
        <a
          key={match.index}
          href={isLineUrl ? LINE_URL : matched}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 underline underline-offset-2 hover:brightness-125 transition break-all"
        >
          {isLineUrl ? "LINE @31PANICH" : matched}
        </a>
      )
    } else {
      // Phone number
      const digits = matched.replace(/-/g, "")
      parts.push(
        <a
          key={match.index}
          href={`tel:${digits}`}
          className="text-emerald-400 font-medium underline underline-offset-2 hover:brightness-125 transition"
        >
          {matched}
        </a>
      )
    }

    lastIndex = match.index + matched.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export default function ChatMessage({ role, text, onReplay, ttsLoading, ttsPlaying }: Props) {
  const isUser = role === "user"
  const showSpeaker = !isUser && typeof onReplay === "function"

  const content = isUser
    ? text
    : text.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {parseLinks(line)}
        </span>
      ))

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-purple-500/[0.18] border border-purple-300/25 text-white rounded-2xl rounded-br-md"
            : "bg-white/[0.06] border border-white/10 text-gray-100 rounded-2xl rounded-bl-md"
        } ${showSpeaker ? "pr-8" : ""}`}
      >
        {content}

        {showSpeaker && (
          <button
            type="button"
            onClick={onReplay}
            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              ttsPlaying
                ? "bg-purple-500/30 text-purple-200 ring-1 ring-purple-400/60 animate-pulse"
                : "bg-white/5 hover:bg-purple-500/20 text-gray-500 hover:text-purple-300"
            }`}
            title={ttsPlaying ? "กำลังเล่น" : ttsLoading ? "กำลังสร้างเสียง..." : "ฟังเสียง"}
            aria-label={ttsPlaying ? "กำลังเล่นเสียง" : "อ่านออกเสียงข้อความนี้"}
          >
            {ttsLoading ? (
              <span className="block w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin" />
            ) : ttsPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14l-1.42-1.42a8 8 0 000-11.3l1.42-1.42zM15.54 8.46a5 5 0 010 7.07l-1.41-1.41a3 3 0 000-4.24l1.41-1.42z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07l-1.41-1.41a3 3 0 000-4.24l1.41-1.42z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
