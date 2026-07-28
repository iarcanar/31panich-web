"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import type { Task, TaskStatus } from "@/types/task"
import { STATUS_META, STATUS_ORDER } from "@/components/admin/tasks/status"
import { TaskCard } from "@/components/admin/tasks/TaskCard"
import { useAuth } from "../layout"

const TaskEditor = dynamic(() => import("@/components/admin/tasks/TaskEditor"), { ssr: false })

type FilterKey = "all" | TaskStatus

const PROD_ADMIN_URL = "https://31panich.co.th/admin/tasks"

/** Detect if running on dev (localhost) — client-side only. SSR-safe. */
function useIsDevHost(): boolean {
  const [isDev, setIsDev] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const h = window.location.hostname
    setIsDev(h === "localhost" || h === "127.0.0.1" || h.endsWith(".local"))
  }, [])
  return isDev
}

export default function AdminTasksPage() {
  const isDev = useIsDevHost()
  // สั่งงาน/แก้ไข/ลบ = ทุก role · เดินสถานะ = admin (ทีมทำสื่อ) เท่านั้น
  const { isAdmin } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [showEditor, setShowEditor] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch("/api/admin/tasks")
      if (!res.ok) throw new Error()
      const data: Task[] = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // โหลดครั้งเดียวตอน mount — ห้าม polling
  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditingTask(null)
    setShowEditor(true)
  }

  function openEdit(t: Task) {
    setEditingTask(t)
    setShowEditor(true)
  }

  function closeEditor() {
    setShowEditor(false)
    setEditingTask(null)
  }

  function handleSaved(t: Task) {
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === t.id)
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev]
    })
    closeEditor()
  }

  function handleChanged(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))
  }

  async function handleDelete(t: Task) {
    if (!confirm(`ลบใบงาน ${t.code}?\nรูปที่แนบไว้จะถูกลบถาวรด้วย กู้คืนไม่ได้`)) return
    try {
      const res = await fetch(`/api/admin/tasks/${t.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setTasks((prev) => prev.filter((x) => x.id !== t.id))
    } catch {
      alert("ลบไม่สำเร็จ ลองอีกครั้ง")
    }
  }

  const counts: Record<FilterKey, number> = {
    all: tasks.length,
    requested: tasks.filter((t) => t.status === "requested").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {isDev && <DevWarningBanner />}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-[22px] md:text-[26px] font-bold text-white">สั่งงาน</h1>
          <p className="text-[14px] md:text-[15px] text-[#64748b] mt-0.5">ส่งงานให้ทีมทำสื่อ · ตามสถานะได้ที่นี่</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="shrink-0 h-10 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          + สั่งงานใหม่
        </button>
      </div>

      {/* filter chips — เลื่อนข้างได้ ไม่ตัดขอบ */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 mb-4 pb-1">
        <FilterChip label={`ทั้งหมด ${counts.all}`} active={filter === "all"} onClick={() => setFilter("all")} />
        {STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={`${STATUS_META[s].label} ${counts[s]}`}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#64748b] text-[17px]">กำลังโหลด...</div>
      ) : loadError ? (
        <button
          type="button"
          onClick={load}
          className="w-full bg-[#13131d] border border-dashed border-red-500/30 rounded-xl p-8 text-center text-red-300 text-[17px] cursor-pointer"
        >
          โหลดไม่สำเร็จ — แตะเพื่อลองใหม่
        </button>
      ) : filtered.length === 0 ? (
        tasks.length === 0 ? (
          <div className="bg-[#13131d] border border-dashed border-[#2a2a3a] rounded-xl p-8 text-center">
            <div className="text-[#64748b] text-[17px] mb-3">ยังไม่มีใบงาน</div>
            <button
              type="button"
              onClick={openNew}
              className="h-10 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[15px] font-medium transition-colors cursor-pointer"
            >
              สั่งงานแรกเลย
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-[#64748b] text-[17px]">ไม่มีใบงานในสถานะนี้</div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              canChangeStatus={isAdmin}
              onChanged={handleChanged}
              onEdit={() => openEdit(t)}
              onDelete={() => handleDelete(t)}
            />
          ))}
        </div>
      )}

      {showEditor && <TaskEditor task={editingTask} onClose={closeEditor} onSaved={handleSaved} />}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 h-10 px-3.5 rounded-lg text-[15px] whitespace-nowrap transition-colors cursor-pointer ${
        active
          ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
          : "bg-[#1a1a28] text-[#94a3b8] border border-white/10"
      }`}
    >
      {label}
    </button>
  )
}

/** Persistent warning shown on dev (localhost) — dev เขียนลง local JSON เท่านั้น
 *  ไม่เข้า production Redis เลย ใบงานที่สั่งที่นี่จะไปไม่ถึงทีมทำสื่อจริง */
function DevWarningBanner() {
  return (
    <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/50 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2L1 21h22L12 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-amber-300 text-[17px]">คุณกำลังใช้ Dev (localhost)</div>
          <p className="text-amber-200/80 mt-0.5 th-text text-[15px]">
            ใบงานที่สั่งที่นี่ <strong>จะไม่ถึงทีมทำสื่อจริง</strong> — data เขียนลง local JSON เท่านั้น
            ไม่เข้า production Redis
          </p>
          <a
            href={PROD_ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors cursor-pointer whitespace-nowrap text-[15px]"
          >
            เปิดหน้า Admin จริง
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <div className="text-[13px] text-amber-200/50 mt-1.5 font-mono">{PROD_ADMIN_URL}</div>
        </div>
      </div>
    </div>
  )
}
