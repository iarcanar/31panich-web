"use client"

import { useState, useEffect, useCallback } from "react"

// ─── Types ────────────────────────────────────────────
interface TimeseriesItem { key: string; total: number; devices?: number }
interface RankedItem { key: string; value: number }
interface AnalyticsData {
  configured: boolean
  period: string
  timeseries?: { data: TimeseriesItem[] }
  topPages?: { data: RankedItem[] }
  topReferrers?: { data: RankedItem[] }
  countries?: { data: RankedItem[] }
  devices?: { data: RankedItem[] }
  browsers?: { data: RankedItem[] }
  os?: { data: RankedItem[] }
  timeseriesError?: string
}

// ─── Helpers ──────────────────────────────────────────
function formatNum(n: number) { return n.toLocaleString("th-TH") }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl p-4">
      <div className="text-[11px] text-[#64748b] mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{typeof value === "number" ? formatNum(value) : value}</div>
      {sub && <div className="text-[10px] text-[#64748b] mt-1">{sub}</div>}
    </div>
  )
}

function RankedList({ title, items }: { title: string; items: RankedItem[] }) {
  if (!items?.length) return null
  const max = Math.max(...items.map((i) => i.value || 0))
  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const label = item.key || "(ไม่ทราบ)"
          const val = item.value || 0
          const pct = max > 0 ? (val / max) * 100 : 0
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-white/80 truncate mr-2">{label || "(direct)"}</span>
                <span className="text-white font-medium shrink-0">{formatNum(val)}</span>
              </div>
              <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mini bar chart ───────────────────────────────────
function MiniChart({ data }: { data: TimeseriesItem[] }) {
  if (!data?.length) return <div className="text-xs text-[#64748b] py-8 text-center">ยังไม่มีข้อมูล</div>
  const max = Math.max(...data.map((d) => d.total), 1)
  const barCount = data.length
  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-4">
      <h3 className="text-xs font-medium text-[#94a3b8] mb-3">Page Views</h3>
      <div className="flex items-end gap-px h-32">
        {data.map((d, i) => {
          const h = (d.total / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className="w-full bg-cyan-500/50 hover:bg-cyan-400/70 rounded-t transition-colors min-h-[2px]"
                style={{ height: `${Math.max(h, 1.5)}%` }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded px-2 py-1 text-[9px] text-white whitespace-nowrap shadow-lg">
                  {d.key.slice(5, 10)} — {formatNum(d.total)} views
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-[#64748b]">{data[0]?.key.slice(5, 10)}</span>
        {barCount > 2 && <span className="text-[9px] text-[#64748b]">{data[Math.floor(barCount / 2)]?.key.slice(5, 10)}</span>}
        <span className="text-[9px] text-[#64748b]">{data[barCount - 1]?.key.slice(5, 10)}</span>
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

  // Computed totals
  const totalViews = data?.timeseries?.data?.reduce((s, d) => s + d.total, 0) ?? 0
  const totalVisitors = data?.timeseries?.data?.reduce((s, d) => s + (d.devices ?? 0), 0) ?? 0
  const topPage = data?.topPages?.data?.[0]

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
        {/* Period selector */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Not configured */}
      {!loading && !data?.configured && (
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-8 text-center">
          <p className="text-sm text-[#64748b] mb-2">ยังไม่ได้เชื่อมต่อ Vercel Analytics</p>
          <p className="text-xs text-[#475569]">ต้องเปิดใช้ Web Analytics ใน Vercel Dashboard ก่อน</p>
          {data?.timeseriesError && (
            <p className="text-xs text-red-400/70 mt-2 font-mono">{data.timeseriesError}</p>
          )}
        </div>
      )}

      {/* Data loaded */}
      {!loading && data?.configured && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Page Views" value={totalViews} sub={`ช่วง ${PERIODS.find((p) => p.value === period)?.label}`} />
            <StatCard label="Visitors" value={totalVisitors} sub="จำนวนอุปกรณ์ที่เข้าชม" />
            <StatCard
              label="หน้ายอดนิยม"
              value={topPage?.key || "-"}
              sub={topPage ? `${formatNum(topPage.value)} views` : undefined}
            />
          </div>

          {/* Timeseries chart */}
          <div className="mb-6">
            <MiniChart data={data.timeseries?.data || []} />
          </div>

          {/* Grid: pages, referrers, countries, devices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <RankedList title="หน้าเว็บยอดนิยม" items={data.topPages?.data || []} />
            <RankedList title="แหล่งที่มา (Referrer)" items={data.topReferrers?.data || []} />
            <RankedList title="ประเทศ" items={data.countries?.data || []} />
            <RankedList title="อุปกรณ์" items={data.devices?.data || []} />
            <RankedList title="เบราว์เซอร์" items={data.browsers?.data || []} />
            <RankedList title="ระบบปฏิบัติการ" items={data.os?.data || []} />
          </div>

          {/* Error hint */}
          {data.timeseriesError && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400">
              API Error: {data.timeseriesError}
              <p className="text-amber-400/60 mt-1">อาจต้องเปิด Web Analytics ใน Vercel Dashboard → Project → Analytics ก่อน</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
