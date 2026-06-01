"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { useAuth } from "../layout"

interface IpChatLog {
  totalChats: number
  firstSeen: string
  lastActive: string
}

type ChatLogs = Record<string, IpChatLog>

interface Holiday {
  id: string
  name: string
  closedFrom: string
  closedTo: string
  reopenDate: string
  greeting: string
  active: boolean
}

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]

function dayName(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return THAI_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] || ""
}

function formatThaiDate(iso: string): string {
  if (!iso) return ""
  const [, m, d] = iso.split("-").map(Number)
  const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
  return `${d} ${MONTHS[m - 1]}`
}

const EMPTY_HOLIDAY: Holiday = {
  id: "",
  name: "",
  closedFrom: "",
  closedTo: "",
  reopenDate: "",
  greeting: "",
  active: true,
}

interface Campaign {
  id: string
  name: string
  active: boolean
  startDate: string
  endDate: string
  chipLabel: string
  answer: string
  answerDetail?: string
}

const EMPTY_CAMPAIGN: Campaign = {
  id: "",
  name: "",
  active: true,
  startDate: "",
  endDate: "",
  chipLabel: "",
  answer: "",
  answerDetail: "",
}

export default function AiLogsPage() {
  const { isAdmin } = useAuth()
  const [logs, setLogs] = useState<ChatLogs>({})
  const [loading, setLoading] = useState(true)
  // expandedIp removed — stats-only mode (no conversation content stored)

  // Prompt editor state
  const [instructions, setInstructions] = useState("")
  const [savedInstructions, setSavedInstructions] = useState("")
  const [promptLoading, setPromptLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [showPrompt, setShowPrompt] = useState(false)

  // Holiday state
  const [showHolidays, setShowHolidays] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holidayLoading, setHolidayLoading] = useState(true)
  const [holidaySaving, setHolidaySaving] = useState(false)
  const [holidayMsg, setHolidayMsg] = useState("")
  const [editing, setEditing] = useState<Holiday | null>(null)

  // Campaign (โปรพิเศษ/โครงการรัฐ) state
  const [showCampaigns, setShowCampaigns] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [campaignSaving, setCampaignSaving] = useState(false)
  const [campaignMsg, setCampaignMsg] = useState("")
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

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

  async function fetchHolidays() {
    setHolidayLoading(true)
    try {
      const res = await fetch("/api/admin/holidays")
      const data = await res.json()
      if (Array.isArray(data)) setHolidays(data)
    } catch { /* ignore */ }
    setHolidayLoading(false)
  }

  async function saveHolidays() {
    setHolidaySaving(true)
    setHolidayMsg("")
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidays),
      })
      const data = await res.json()
      if (data.ok) {
        setHolidayMsg("บันทึกแล้ว")
        setTimeout(() => setHolidayMsg(""), 3000)
      } else {
        setHolidayMsg(data.error || "เกิดข้อผิดพลาด")
      }
    } catch {
      setHolidayMsg("เกิดข้อผิดพลาด")
    }
    setHolidaySaving(false)
  }

  function handleAddHoliday() {
    setEditing({ ...EMPTY_HOLIDAY, id: `holiday-${Date.now()}` })
  }

  function handleEditHoliday(h: Holiday) {
    setEditing({ ...h })
  }

  function handleDeleteHoliday(id: string) {
    setHolidays((prev) => prev.filter((h) => h.id !== id))
  }

  function handleToggleHoliday(id: string) {
    setHolidays((prev) => prev.map((h) => h.id === id ? { ...h, active: !h.active } : h))
  }

  function handleEditorSave() {
    if (!editing) return
    if (!editing.name || !editing.closedFrom || !editing.closedTo || !editing.reopenDate) {
      setHolidayMsg("กรุณากรอกข้อมูลให้ครบ")
      setTimeout(() => setHolidayMsg(""), 3000)
      return
    }
    setHolidays((prev) => {
      const idx = prev.findIndex((h) => h.id === editing.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = editing
        return copy
      }
      return [...prev, editing]
    })
    setEditing(null)
  }

  function handleClosedToChange(val: string) {
    if (!editing) return
    const next = { ...editing, closedTo: val }
    if (val) {
      const d = new Date(val + "T00:00:00+07:00")
      d.setDate(d.getDate() + 1)
      next.reopenDate = d.toISOString().split("T")[0]
    }
    setEditing(next)
  }

  // ── Campaign handlers ──
  async function fetchCampaigns() {
    setCampaignLoading(true)
    try {
      const res = await fetch("/api/admin/campaigns")
      const data = await res.json()
      if (Array.isArray(data)) setCampaigns(data)
    } catch { /* ignore */ }
    setCampaignLoading(false)
  }

  async function persistCampaigns() {
    setCampaignSaving(true)
    setCampaignMsg("")
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaigns),
      })
      const data = await res.json()
      if (data.ok) {
        setCampaignMsg("บันทึกแล้ว")
        setTimeout(() => setCampaignMsg(""), 3000)
      } else {
        setCampaignMsg(data.error || "เกิดข้อผิดพลาด")
      }
    } catch {
      setCampaignMsg("เกิดข้อผิดพลาด")
    }
    setCampaignSaving(false)
  }

  function handleToggleCampaign(id: string) {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c))
  }

  function handleDeleteCampaign(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  function handleCampaignEditorSave() {
    if (!editingCampaign) return
    if (!editingCampaign.name || !editingCampaign.startDate || !editingCampaign.endDate || !editingCampaign.chipLabel || !editingCampaign.answer) {
      setCampaignMsg("กรุณากรอกข้อมูลให้ครบ")
      setTimeout(() => setCampaignMsg(""), 3000)
      return
    }
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === editingCampaign.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = editingCampaign
        return copy
      }
      return [...prev, editingCampaign]
    })
    setEditingCampaign(null)
  }

  useEffect(() => { fetchLogs(); fetchConfig(); fetchHolidays(); fetchCampaigns() }, [])

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

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#64748b]">เฉพาะ Admin เท่านั้น</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#14141f]/92 backdrop-blur-xl border-b border-[#2a2a3a]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="31 พานิช" width={32} height={32} className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-sm font-bold tracking-wide">AI BACK-END</h1>
              <p className="text-[10px] text-[#64748b]">จัดการระบบ AI สามหนึ่งพานิช</p>
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

        {/* Holiday Manager */}
        <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-sm font-medium">วันหยุดนักขัตฤกษ์</span>
              {holidays.some((h) => h.active) && (
                <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                  {holidays.filter((h) => h.active).length} รายการ
                </span>
              )}
            </div>
            <svg className={`w-4 h-4 text-[#64748b] transition-transform ${showHolidays ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHolidays && (
            <div className="border-t border-[#2a2a3a] p-4 space-y-3">
              <p className="text-[11px] text-[#64748b]">
                เพิ่มวันหยุดเพื่อให้บอทตอบลูกค้า และซ่อนปุ่มโทร/LINE ในช่วงวันหยุด · กดบันทึกเพื่อให้มีผลทันที
              </p>

              {/* Holiday list */}
              {holidayLoading ? (
                <div className="text-center text-[#64748b] py-4 text-sm">กำลังโหลด...</div>
              ) : holidays.length === 0 && !editing ? (
                <div className="text-[#64748b] text-sm py-4 text-center border border-dashed border-[#2a2a3a] rounded-xl">
                  ยังไม่มีข้อมูลวันหยุด
                </div>
              ) : (
                <div className="space-y-2">
                  {holidays.map((h) => (
                    <div
                      key={h.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        h.active ? "border-purple-500/30 bg-[#1e1e2e]" : "border-[#2a2a3a] bg-[#1e1e2e]/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm text-white font-bold ${!h.active ? "line-through" : ""}`}>
                              {h.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                              h.active
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/40"
                            }`}>
                              {h.active ? "เปิดใช้" : "ปิด"}
                            </span>
                          </div>
                          <p className="text-[#94a3b8] text-[11px]">
                            หยุด {formatThaiDate(h.closedFrom)} – {formatThaiDate(h.closedTo)}
                            {" · เปิดวัน"}
                            {dayName(h.reopenDate)}ที่ {formatThaiDate(h.reopenDate)}
                          </p>
                          {h.greeting && (
                            <p className="text-[#64748b] text-[10px] mt-0.5 truncate">{h.greeting}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleToggleHoliday(h.id)}
                            className="p-1 rounded text-[#64748b] hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                            title={h.active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {h.active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              )}
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditHoliday(h)}
                            className="p-1 rounded text-[#64748b] hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                            title="แก้ไข"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1 rounded text-[#64748b] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="ลบ"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Editor inline */}
              {editing && (
                <div className="border border-purple-500/30 bg-[#1e1e2e] rounded-lg p-4 space-y-3">
                  <p className="text-xs text-white font-bold">
                    {holidays.some((h) => h.id === editing.id) ? "แก้ไขวันหยุด" : "เพิ่มวันหยุดใหม่"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">ชื่อเทศกาล</label>
                      <input
                        type="text"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="เช่น สงกรานต์ 2569"
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-purple-400/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748b] text-[10px] mb-1">วันหยุดตั้งแต่</label>
                      <input
                        type="date"
                        value={editing.closedFrom}
                        onChange={(e) => setEditing({ ...editing, closedFrom: e.target.value })}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40 [color-scheme:dark]"
                      />
                      {editing.closedFrom && <p className="text-[#64748b] text-[10px] mt-0.5">วัน{dayName(editing.closedFrom)}</p>}
                    </div>
                    <div>
                      <label className="block text-[#64748b] text-[10px] mb-1">ถึงวันที่</label>
                      <input
                        type="date"
                        value={editing.closedTo}
                        onChange={(e) => handleClosedToChange(e.target.value)}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40 [color-scheme:dark]"
                      />
                      {editing.closedTo && <p className="text-[#64748b] text-[10px] mt-0.5">วัน{dayName(editing.closedTo)}</p>}
                    </div>
                    <div>
                      <label className="block text-[#64748b] text-[10px] mb-1">วันเปิดทำการ</label>
                      <input
                        type="date"
                        value={editing.reopenDate}
                        onChange={(e) => setEditing({ ...editing, reopenDate: e.target.value })}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40 [color-scheme:dark]"
                      />
                      {editing.reopenDate && (
                        <p className="text-emerald-400 text-[10px] mt-0.5">
                          เปิดวัน{dayName(editing.reopenDate)}ที่ {formatThaiDate(editing.reopenDate)}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">คำอวยพรสั้นๆ (บอทใช้ตอบลูกค้า)</label>
                      <textarea
                        value={editing.greeting}
                        onChange={(e) => setEditing({ ...editing, greeting: e.target.value })}
                        placeholder="เช่น สุขสันต์วันสงกรานต์ค่ะ 🙏🌊"
                        rows={2}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-purple-400/40 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-[#64748b] hover:text-white text-xs transition-colors">
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleEditorSave}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}

              {/* Add + Save buttons */}
              <div className="flex items-center justify-between">
                {!editing ? (
                  <button
                    onClick={handleAddHoliday}
                    className="text-[#64748b] hover:text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-dashed border-[#2a2a3a] hover:border-purple-400/40 transition-colors"
                  >
                    + เพิ่มวันหยุด
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  {holidayMsg && (
                    <span className={`text-xs ${holidayMsg === "บันทึกแล้ว" ? "text-emerald-400" : "text-red-400"}`}>
                      {holidayMsg}
                    </span>
                  )}
                  <button
                    onClick={saveHolidays}
                    disabled={holidaySaving}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-[#2a2a3a] disabled:text-[#64748b] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {holidaySaving ? "กำลังบันทึก..." : "บันทึกวันหยุด"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Campaign Manager — โปรพิเศษ/โครงการรัฐ (plug in/out เหมือนวันหยุด) */}
        <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCampaigns(!showCampaigns)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <span className="text-sm font-medium">โปรพิเศษ / โครงการรัฐ</span>
              {campaigns.some((c) => c.active) && (
                <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                  {campaigns.filter((c) => c.active).length} รายการ
                </span>
              )}
            </div>
            <svg className={`w-4 h-4 text-[#64748b] transition-transform ${showCampaigns ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCampaigns && (
            <div className="border-t border-[#2a2a3a] p-4 space-y-3">
              <p className="text-[11px] text-[#64748b]">
                โปรพิเศษมีระยะเวลาจำกัด (เช่น มาตรการรัฐ) · บอทจะตอบลูกค้า + โชว์ปุ่มลัดในแชทเฉพาะช่วงที่เปิดใช้ · ปิด/ลบ หรือเลยวันสิ้นสุด = หายเอง · กดบันทึกเพื่อให้มีผล
              </p>

              {campaignLoading ? (
                <div className="text-center text-[#64748b] py-4 text-sm">กำลังโหลด...</div>
              ) : campaigns.length === 0 && !editingCampaign ? (
                <div className="text-[#64748b] text-sm py-4 text-center border border-dashed border-[#2a2a3a] rounded-xl">
                  ยังไม่มีโปรพิเศษ
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        c.active ? "border-amber-500/30 bg-[#1e1e2e]" : "border-[#2a2a3a] bg-[#1e1e2e]/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm text-white font-bold ${!c.active ? "line-through" : ""}`}>
                              {c.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                              c.active
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/40"
                            }`}>
                              {c.active ? "เปิดใช้" : "ปิด"}
                            </span>
                          </div>
                          <p className="text-[#94a3b8] text-[11px]">
                            {formatThaiDate(c.startDate)} – {formatThaiDate(c.endDate)}
                          </p>
                          {c.chipLabel && (
                            <p className="text-amber-300/70 text-[10px] mt-0.5 truncate">ปุ่มลัด: {c.chipLabel}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleToggleCampaign(c.id)}
                            className="p-1 rounded text-[#64748b] hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                            title={c.active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {c.active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              )}
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingCampaign({ ...c })}
                            className="p-1 rounded text-[#64748b] hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                            title="แก้ไข"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(c.id)}
                            className="p-1 rounded text-[#64748b] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="ลบ"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Editor inline */}
              {editingCampaign && (
                <div className="border border-amber-500/30 bg-[#1e1e2e] rounded-lg p-4 space-y-3">
                  <p className="text-xs text-white font-bold">
                    {campaigns.some((c) => c.id === editingCampaign.id) ? "แก้ไขโปรพิเศษ" : "เพิ่มโปรพิเศษใหม่"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">ชื่อโครงการ</label>
                      <input
                        type="text"
                        value={editingCampaign.name}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                        placeholder="เช่น ไทยช่วยไทย พลัส (60/40)"
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-amber-400/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748b] text-[10px] mb-1">เริ่มวันที่</label>
                      <input
                        type="date"
                        value={editingCampaign.startDate}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, startDate: e.target.value })}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748b] text-[10px] mb-1">สิ้นสุดวันที่</label>
                      <input
                        type="date"
                        value={editingCampaign.endDate}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, endDate: e.target.value })}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 [color-scheme:dark]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">ข้อความปุ่มลัดในแชท</label>
                      <input
                        type="text"
                        value={editingCampaign.chipLabel}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, chipLabel: e.target.value })}
                        placeholder="เช่น ร่วมโครงการไทยช่วยไทยมั้ย?"
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-amber-400/40"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">คำตอบสั้น (default — แค่บอกว่าร่วมโครงการ ลงท้าย &quot;ครับ&quot;)</label>
                      <textarea
                        value={editingCampaign.answer}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, answer: e.target.value })}
                        placeholder="เช่น ร่วมครับ ร้านสามหนึ่งเข้าร่วมโครงการ ... แล้ว"
                        rows={2}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-amber-400/40 resize-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[#64748b] text-[10px] mb-1">คำตอบเมื่อลูกค้าถามรายละเอียด (ไม่ใส่ก็ได้ — เช่น กี่บาท/เงื่อนไข)</label>
                      <textarea
                        value={editingCampaign.answerDetail || ""}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, answerDetail: e.target.value })}
                        placeholder="คำตอบละเอียด ใช้เมื่อลูกค้าถาม กี่บาท / เงื่อนไข / คิดยังไง"
                        rows={4}
                        className="w-full bg-[#0e0e14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] outline-none focus:border-amber-400/40 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditingCampaign(null)} className="px-3 py-1.5 text-[#64748b] hover:text-white text-xs transition-colors">
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleCampaignEditorSave}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}

              {/* Add + Save buttons */}
              <div className="flex items-center justify-between">
                {!editingCampaign ? (
                  <button
                    onClick={() => setEditingCampaign({ ...EMPTY_CAMPAIGN, id: `campaign-${Date.now()}` })}
                    className="text-[#64748b] hover:text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-dashed border-[#2a2a3a] hover:border-amber-400/40 transition-colors"
                  >
                    + เพิ่มโปรพิเศษ
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  {campaignMsg && (
                    <span className={`text-xs ${campaignMsg === "บันทึกแล้ว" ? "text-emerald-400" : "text-red-400"}`}>
                      {campaignMsg}
                    </span>
                  )}
                  <button
                    onClick={persistCampaigns}
                    disabled={campaignSaving}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-[#2a2a3a] disabled:text-[#64748b] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {campaignSaving ? "กำลังบันทึก..." : "บันทึกโปรพิเศษ"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* IP List — stats only (no conversation content) */}
        {loading && ips.length === 0 ? (
          <div className="text-center text-[#64748b] py-12">กำลังโหลด...</div>
        ) : ips.length === 0 ? (
          <div className="text-center text-[#64748b] py-12">ยังไม่มีประวัติสนทนา</div>
        ) : (
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_60px_100px_100px] sm:grid-cols-[1fr_80px_130px_130px] px-4 py-2.5 border-b border-[#2a2a3a] text-[10px] font-medium text-[#64748b] uppercase tracking-wider">
              <span>IP Address</span>
              <span className="text-center">แชท</span>
              <span className="text-center">เริ่มใช้</span>
              <span className="text-center">ล่าสุด</span>
            </div>

            {ips.map(([ip, data]) => (
              <div
                key={ip}
                className="grid grid-cols-[1fr_60px_100px_100px] sm:grid-cols-[1fr_80px_130px_130px] px-4 py-3 border-b border-[#2a2a3a]/50 last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-mono text-[#f1f5f9] truncate">{ip}</span>
                <span className="text-sm text-center text-purple-300">{data.totalChats}</span>
                <span className="text-[11px] text-center text-[#64748b] font-mono">{data.firstSeen ? formatTime(data.firstSeen) : "-"}</span>
                <span className="text-[11px] text-center text-[#94a3b8] font-mono">{formatTime(data.lastActive)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
