"use client"

import { useEffect, useRef } from "react"

export function DescriptionTextarea({
  value,
  onChange,
  flash,
}: {
  value: string
  onChange: (v: string) => void
  flash?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef<number | null>(null)

  useEffect(() => {
    if (cursorRef.current !== null && ref.current) {
      ref.current.selectionStart = ref.current.selectionEnd = cursorRef.current
      cursorRef.current = null
    }
  }, [value])

  useEffect(() => {
    if (flash && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [flash])

  const ROW_H = 22
  const PAD = 16

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    const cleaned = text.split("\n").filter((l) => l.trim() !== "").join("\n")
    const start = e.currentTarget.selectionStart
    const end = e.currentTarget.selectionEnd
    cursorRef.current = start + cleaned.length
    onChange(value.slice(0, start) + cleaned + value.slice(end))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      const line = value.slice(
        lineStart,
        value.indexOf("\n", start) === -1 ? undefined : value.indexOf("\n", start),
      )

      if (line.startsWith("• ")) {
        cursorRef.current = Math.max(lineStart, start - 2)
        onChange(value.slice(0, lineStart) + line.slice(2) + value.slice(lineStart + line.length))
      } else {
        cursorRef.current = start + 2
        onChange(value.slice(0, lineStart) + "• " + value.slice(lineStart))
      }
    }
  }

  function cleanText() {
    onChange(
      value
        .split("\n")
        .map((l) => l.replace(/\*/g, "").trim())
        .filter((l) => l !== "")
        .join("\n"),
    )
  }

  const lineCount = value.split("\n").filter(Boolean).length

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        rows={6}
        data-field="description"
        style={{ minHeight: 6 * ROW_H + PAD, maxHeight: 25 * ROW_H + PAD }}
        className={`w-full px-3 py-2 bg-[#1e1e2e] border rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm transition-all duration-150 focus:border-[#94a3b8] outline-none resize-y leading-relaxed ${
          flash
            ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-ai-flash"
            : "border-[#2a2a3a]"
        }`}
        placeholder="รายละเอียดสินค้า... (Tab = bullet • | วางข้อความจะลบบรรทัดว่างอัตโนมัติ)"
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-[#64748b]">{lineCount > 0 ? `${lineCount} บรรทัด` : ""}</p>
        {value.includes("\n\n") || value !== value.trim() || value.includes("*") ? (
          <button
            type="button"
            onClick={cleanText}
            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
            Clean
          </button>
        ) : null}
      </div>
    </div>
  )
}
