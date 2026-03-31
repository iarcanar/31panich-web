"use client"

import { useState, useEffect, useCallback } from "react"

// ─── Types ────────────────────────────────────────────
interface TimeseriesItem { key: string; views: number; visitors: number; bounceRate: number }
interface Summary {
  totalViews: number
  totalVisitors: number
  avgBounceRate: number
  peakTime: string | null
  peakViews: number
  dataPoints: number
}
interface AnalyticsData {
  configured: boolean
  period: string
  summary?: Summary
  timeseries?: TimeseriesItem[]
  error?: string
}

// ─── Helpers ──────────────────────────────────────────
function fmtNum(n: number) { return n.toLocaleString("th-TH") }

function fmtTime(iso: string, period: string) {
  const d = new Date(iso)
  if (period === "24h") return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })
}

function StatCard({ label, value, sub, color = "white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorClass: Record<string, string> = {
    white: "text-white",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }
  return (
    <div className="bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl p-4">
      <div className="text-[11px] text-[#64748b] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass[color] || "text-white"}`}>
        {typeof value === "number" ? fmtNum(value) : value}
      </div>
      {sub && <div className="text-[10px] text-[#64748b] mt-1">{sub}</div>}
    </div>
  )
}

// ─── Bar chart ────────────────────────────────────────
function BarChart({ data, period }: { data: TimeseriesItem[]; period: string }) {
  if (!data?.length) return <div className="text-xs text-[#64748b] py-12 text-center">ยังไม่มีข้อมูล — รอสักครู่หลังเปิด Analytics</div>

  // Aggregate by day if 7d/30d (raw is hourly)
  let display = data
  if (period !== "24h") {
    const dayMap = new Map<string, { views: number; visitors: number }>()
    for (const d of data) {
      const day = d.key.slice(0, 10)
      const existing = dayMap.get(day) || { views: 0, visitors: 0 }
      existing.views += d.views
      existing.visitors += d.visitors
      dayMap.set(day, existing)
    }
    display = Array.from(dayMap.entries()).map(([key, v]) => ({
      key, views: v.views, visitors: v.visitors, bounceRate: 0,
    }))
  }

  const max = Math.max(...display.map((d) => d.views), 1)

  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#94a3b8]">Page Views</h3>
        <div className="flex items-center gap-3 text-[10px] text-[#64748b]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500/60" />Views</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/60" />Visitors</span>
        </div>
      </div>
      <div className="flex items-end gap-px h-40">
        {display.map((d, i) => {
          const hViews = (d.views / max) * 100
          const hVisitors = max > 0 ? (d.visitors / max) * 100 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              {/* Visitors bar (behind) */}
              <div className="w-full flex items-end gap-px">
                <div
                  className="flex-1 bg-cyan-500/50 hover:bg-cyan-400/70 rounded-t transition-colors min-h-[2px]"
                  style={{ height: `${Math.max(hViews, 1.5)}%` }}
                />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded px-2 py-1 text-[9px] text-white whitespace-nowrap shadow-lg">
                  <div>{fmtTime(d.key, period)}</div>
                  <div className="text-cyan-400">{fmtNum(d.views)} views</div>
                  <div className="text-amber-400">{fmtNum(d.visitors)} visitors</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* X-axis */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-[#64748b]">{fmtTime(display[0]?.key, period)}</span>
        {display.length > 4 && <span className="text-[9px] text-[#64748b]">{fmtTime(display[Math.floor(display.length / 2)]?.key, period)}</span>}
        <span className="text-[9px] text-[#64748b]">{fmtTime(display[display.length - 1]?.key, period)}</span>
      </div>
    </div>
  )
}

// ─── Hourly heatmap ───────────────────────────────────
function HourlyHeatmap({ data }: { data: TimeseriesItem[] }) {
  if (!data?.length) return null
  // Aggregate views by hour of day
  const hourly = new Array(24).fill(0)
  for (const d of data) {
    const h = new Date(d.key).getHours()
    hourly[h] += d.views
  }
  const max = Math.max(...hourly, 1)

  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] mb-3">ช่วงเวลาที่มีคนเข้าชม</h3>
      <div className="flex gap-0.5">
        {hourly.map((v, h) => {
          const intensity = max > 0 ? v / max : 0
          return (
            <div key={h} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full h-8 rounded-sm transition-colors"
                style={{ backgroundColor: `rgba(34,211,238,${0.08 + intensity * 0.7})` }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded px-2 py-1 text-[9px] text-white whitespace-nowrap shadow-lg">
                  {String(h).padStart(2, "0")}:00 — {fmtNum(v)} views
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-[#64748b]">00:00</span>
        <span className="text-[8px] text-[#64748b]">06:00</span>
        <span className="text-[8px] text-[#64748b]">12:00</span>
        <span className="text-[8px] text-[#64748b]">18:00</span>
        <span className="text-[8px] text-[#64748b]">23:00</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────
const PERIODS = [
  { value: "24h", label: "24 ชม." },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
]

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7d")

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`)
      setData(await res.json())
    } catch {
      setData({ configured: false, period: p })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(period) }, [period, fetchData])

  const s = data?.summary

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <button
            onClick={() => fetchData(period)}
            className="w-8 h-8 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            title="รีเฟรช"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex gap-1 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                period === p.value ? "bg-[#2a2a3a] text-white" : "text-[#64748b] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error / not configured */}
      {!loading && (!data?.configured || data?.error) && (
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-8 text-center">
          <p className="text-sm text-[#64748b] mb-2">ยังไม่สามารถดึงข้อมูล Analytics ได้</p>
          {data?.error && <p className="text-xs text-red-400/70 mt-2 font-mono">{data.error}</p>}
          <p className="text-xs text-[#475569] mt-2">ตรวจสอบว่าเปิด Web Analytics ใน Vercel Dashboard แล้ว</p>
        </div>
      )}

      {/* Data */}
      {!loading && data?.configured && !data?.error && s && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Page Views" value={s.totalViews} color="cyan" sub={PERIODS.find((p) => p.value === period)?.label} />
            <StatCard label="Visitors" value={s.totalVisitors} color="amber" sub="จำนวนอุปกรณ์" />
            <StatCard label="Bounce Rate" value={`${s.avgBounceRate}%`} color={s.avgBounceRate > 70 ? "amber" : "emerald"} sub="เฉลี่ย" />
            <StatCard
              label="Peak"
              value={s.peakViews}
              color="white"
              sub={s.peakTime ? fmtTime(s.peakTime, period) : "-"}
            />
          </div>

          {/* Bar chart */}
          <div className="mb-6">
            <BarChart data={data.timeseries || []} period={period} />
          </div>

          {/* Hourly heatmap */}
          <div className="mb-6">
            <HourlyHeatmap data={data.timeseries || []} />
          </div>

          {/* Data info */}
          <div className="text-[10px] text-[#475569] text-center">
            ข้อมูลจาก Vercel Web Analytics — {s.dataPoints} data points
          </div>
        </>
      )}
    </div>
  )
}
