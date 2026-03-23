"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

interface ChatLogEntry {
  q: string
  a: string
  t: string
}

interface IpChatLog {
  totalChats: number
  lastActive: string
  recent: ChatLogEntry[]
}

type ChatLogs = Record<string, IpChatLog>

export default function AiLogsPage() {
  const [logs, setLogs] = useState<ChatLogs>({})
  const [loading, setLoading] = useState(true)
  const [expandedIp, setExpandedIp] = useState<string | null>(null)

  // Prompt editor state
  const [instructions, setInstructions] = useState("")
  const [savedInstructions, setSavedInstructions] = useState("")
  const [promptLoading, setPromptLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [showPrompt, setShowPrompt] = useState(false)

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/chat-logs")
      setLogs(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function fetchConfig() {
    setPromptLoading(true)
    try {
      const res = await fetch("/api/admin/ai-config")
      const data = await res.json()
      setInstructions(data.instructions || "")
      setSavedInstructions(data.instructions || "")
    } catch { /* ignore */ }
    setPromptLoading(false)
  }

  async function saveConfig() {
    setSaving(true)
    setSaveMsg("")
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      })
      if (res.ok) {
        setSavedInstructions(instructions)
        setSaveMsg("บันทึกแล้ว")
        setTimeout(() => setSaveMsg(""), 3000)
      } else {
        setSaveMsg("เกิดข้อผิดพลาด")
      }
    } catch {
      setSaveMsg("เกิดข้อผิดพลาด")
    }
    setSaving(false)
  }

  useEffect(() => { fetchLogs(); fetchConfig() }, [])

  const hasChanges = instructions !== savedInstructions

  const ips = Object.entries(logs).sort((a, b) => b[1].lastActive.localeCompare(a[1].lastActive))
  const totalChats = ips.reduce((sum, [, v]) => sum + v.totalChats, 0)
  const lastActive = ips.length > 0 ? ips[0][1].lastActive : "-"

  function formatTime(t: string) {
    try {
      const d = new Date(t)
      return d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
    } catch { return t }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#14141f]/92 backdrop-blur-xl border-b border-[#2a2a3a]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="31 พานิช" width={32} height={32} className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-sm font-bold tracking-wide">AI CHAT LOGS</h1>
              <p className="text-[10px] text-[#64748b]">ประวัติสนทนา สามหนึ่ง Ai</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/products"
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#f1f5f9] text-sm px-3 py-2 rounded-lg border border-[#2a2a3a] hover:border-[#94a3b8]/50 transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              สินค้า
            </a>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#f1f5f9] text-sm px-3 py-2 rounded-lg border border-[#2a2a3a] hover:border-[#94a3b8]/50 transition-colors duration-150"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{ips.length}</p>
            <p className="text-[11px] text-[#64748b] mt-1">ผู้ใช้ (IP)</p>
          </div>
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{totalChats}</p>
            <p className="text-[11px] text-[#64748b] mt-1">สนทนาทั้งหมด</p>
          </div>
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl p-4 text-center">
            <p className="text-sm font-mono text-amber-400">{lastActive !== "-" ? formatTime(lastActive) : "-"}</p>
            <p className="text-[11px] text-[#64748b] mt-1">ใช้งานล่าสุด</p>
          </div>
        </div>

        {/* System Prompt Editor */}
        <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">คำแนะนำ AI (System Prompt)</span>
              {hasChanges && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">ยังไม่บันทึก</span>}
            </div>
            <svg className={`w-4 h-4 text-[#64748b] transition-transform ${showPrompt ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPrompt && (
            <div className="border-t border-[#2a2a3a] p-4 space-y-3">
              <p className="text-[11px] text-[#64748b]">
                แก้ไขคำแนะนำพฤติกรรม AI ได้โดยตรง มีผลทันทีกับการสนทนาใหม่
              </p>
              {promptLoading ? (
                <div className="text-center text-[#64748b] py-8 text-sm">กำลังโหลด...</div>
              ) : (
                <>
                  <textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    rows={16}
                    className="w-full bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-[13px] text-[#f1f5f9] leading-relaxed font-mono placeholder:text-[#64748b] focus:outline-none focus:border-[#94a3b8]/50 resize-y"
                    placeholder="คำแนะนำ AI..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasChanges && (
                        <button
                          onClick={() => setInstructions(savedInstructions)}
                          className="text-[#64748b] hover:text-[#f1f5f9] text-xs px-3 py-1.5 rounded-lg border border-[#2a2a3a] hover:border-[#94a3b8]/50 transition-colors"
                        >
                          ยกเลิก
                        </button>
                      )}
                      {saveMsg && (
                        <span className={`text-xs ${saveMsg === "บันทึกแล้ว" ? "text-emerald-400" : "text-red-400"}`}>
                          {saveMsg}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={saveConfig}
                      disabled={saving || !hasChanges}
                      className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-[#2a2a3a] disabled:text-[#64748b] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* IP List */}
        {loading && ips.length === 0 ? (
          <div className="text-center text-[#64748b] py-12">กำลังโหลด...</div>
        ) : ips.length === 0 ? (
          <div className="text-center text-[#64748b] py-12">ยังไม่มีประวัติสนทนา</div>
        ) : (
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_120px_40px] sm:grid-cols-[1fr_100px_140px_40px] px-4 py-2.5 border-b border-[#2a2a3a] text-[10px] font-medium text-[#64748b] uppercase tracking-wider">
              <span>IP Address</span>
              <span className="text-center">แชท</span>
              <span className="text-center">ล่าสุด</span>
              <span />
            </div>

            {ips.map(([ip, data]) => (
              <div key={ip} className="border-b border-[#2a2a3a]/50 last:border-b-0">
                {/* Row */}
                <button
                  onClick={() => setExpandedIp(expandedIp === ip ? null : ip)}
                  className="w-full grid grid-cols-[1fr_80px_120px_40px] sm:grid-cols-[1fr_100px_140px_40px] px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-mono text-[#f1f5f9] truncate">{ip}</span>
                  <span className="text-sm text-center text-purple-300">{data.totalChats}</span>
                  <span className="text-[11px] text-center text-[#94a3b8] font-mono">{formatTime(data.lastActive)}</span>
                  <span className="text-[#64748b] flex justify-center">
                    <svg className={`w-4 h-4 transition-transform ${expandedIp === ip ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {/* Expanded detail */}
                {expandedIp === ip && (
                  <div className="bg-[#1e1e2e] px-4 py-3 space-y-2">
                    <p className="text-[10px] text-[#64748b] mb-2">
                      แสดง {data.recent.length} รายการล่าสุด จากทั้งหมด {data.totalChats} สนทนา
                    </p>
                    {data.recent.map((entry, i) => (
                      <div key={i} className="flex gap-3 text-[12px] leading-relaxed py-1.5 border-b border-[#2a2a3a]/30 last:border-0">
                        <span className="text-[10px] font-mono text-[#64748b] shrink-0 w-24 pt-0.5">
                          {formatTime(entry.t)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-purple-300 truncate">Q: {entry.q}</p>
                          <p className="text-[#94a3b8] truncate">A: {entry.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
