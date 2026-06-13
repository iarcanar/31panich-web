"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { HOURS_OPEN, HOURS_CLOSE } from "@/lib/store-config"

// ─── Types ────────────────────────────────────────────
interface TimeseriesItem { key: string; views: number; visitors: number; bounceRate: number }
interface Summary {
  totalViews: number
  totalVisitors: number
  avgBounceRate: number
  peakTime: string | null
  peakViews: number
  dataPoints: number
  prev?: { totalViews: number; totalVisitors: number; avgBounceRate: number }
}
interface AnalyticsData {
  configured: boolean
  period: string
  summary?: Summary
  timeseries?: TimeseriesItem[]
  error?: string
  dashboardOnly?: boolean
  dashboardUrl?: string
}

// ─── Helpers ──────────────────────────────────────────
function fmtNum(n: number) { return n.toLocaleString("th-TH") }

function fmtTime(iso: string, period: string) {
  const d = new Date(iso)
  if (period === "24h") return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })
}

function deltaPct(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? null : 0  // can't compute % from zero baseline meaningfully
  return Math.round(((cur - prev) / prev) * 100)
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
}

// ─── Delta pill ───────────────────────────────────────
function DeltaPill({ delta, invertColor = false }: { delta: number | null; invertColor?: boolean }) {
  if (delta === null) return null
  const positive = delta > 0
  const neutral = delta === 0
  const good = invertColor ? !positive : positive  // bounce rate: ลง = ดี
  const color = neutral
    ? "bg-slate-500/15 text-slate-400"
    : good
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-red-500/15 text-red-400"
  const arrow = neutral ? "—" : positive ? "↑" : "↓"
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${color}`}>
      {arrow} {Math.abs(delta)}%
    </span>
  )
}

// ─── Sparkline (tiny SVG bar series) ──────────────────
function Sparkline({ values, color = "#22d3ee" }: { values: number[]; color?: string }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const w = 80, h = 20, n = values.length
  const bw = w / n
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5" preserveAspectRatio="none" aria-hidden>
      {values.map((v, i) => {
        const bh = Math.max((v / max) * h, 1)
        return (
          <rect
            key={i}
            x={i * bw + 0.5}
            y={h - bh}
            width={Math.max(bw - 1, 1)}
            height={bh}
            fill={color}
            opacity={0.6}
          />
        )
      })}
    </svg>
  )
}

// ─── KPI card with delta + optional sparkline ─────────
function KpiCard({
  label, value, sub, color = "white", delta, invertDelta = false, sparkline,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  delta?: number | null
  invertDelta?: boolean
  sparkline?: { values: number[]; color: string }
}) {
  const colorClass: Record<string, string> = {
    white: "text-white",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }
  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-3 md:p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-[#64748b]">{label}</div>
        {delta !== undefined && <DeltaPill delta={delta ?? null} invertColor={invertDelta} />}
      </div>
      <div className={`text-2xl md:text-3xl font-bold leading-none ${colorClass[color] || "text-white"}`}>
        {typeof value === "number" ? fmtNum(value) : value}
      </div>
      {sparkline && <div className="mt-1"><Sparkline values={sparkline.values} color={sparkline.color} /></div>}
      {sub && <div className="text-[10px] text-[#64748b] mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Dual-line SVG chart ──────────────────────────────
interface ChartPoint { key: string; views: number; visitors: number; isToday?: boolean }

function LineChart({ data, period }: { data: ChartPoint[]; period: string }) {
  const [pinned, setPinned] = useState<number | null>(null)
  const [dims, setDims] = useState({ w: 800, h: 200 })
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Match viewBox to actual pixel size → 1:1 render, no letterbox, circles stay round
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) setDims({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!data?.length) {
    return <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-8 text-center text-xs text-[#64748b]">ยังไม่มีข้อมูล</div>
  }

  const W = dims.w, H = dims.h, PAD_L = 48, PAD_R = 16, PAD_T = 22, PAD_B = 34
  const innerW = Math.max(W - PAD_L - PAD_R, 100)
  const innerH = Math.max(H - PAD_T - PAD_B, 80)

  const maxViews = Math.max(...data.map((d) => d.views), 1)
  const maxVisitors = Math.max(...data.map((d) => d.visitors), 1)
  const yMax = Math.max(maxViews, maxVisitors)

  // Round up to a "nice" y-axis max (5 / 10 / 25 / 50 / 100 / 250 / 500 / 1000 ...)
  const niceMax = (() => {
    const steps = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    for (const s of steps) if (yMax <= s) return s
    return Math.ceil(yMax / 1000) * 1000
  })()

  const x = (i: number) => PAD_L + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => PAD_T + innerH - (v / niceMax) * innerH

  const viewsPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.views).toFixed(1)}`).join(" ")
  const viewsArea = `${viewsPath} L ${x(data.length - 1).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} Z`
  const visitorsPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.visitors).toFixed(1)}`).join(" ")

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  const todayIdx = data.findIndex((d) => d.isToday)
  const peakIdx = data.reduce((best, d, i) => d.views > data[best].views ? i : best, 0)

  const active = pinned
  const activePoint = active !== null ? data[active] : null

  // ── Time-based reference markers (24h view only) ────
  const firstMs = new Date(data[0].key).getTime()
  const lastMs = new Date(data[data.length - 1].key).getTime()
  const spanMs = Math.max(lastMs - firstMs, 1)
  const xAtMs = (ms: number): number => {
    const ratio = (ms - firstMs) / spanMs
    return PAD_L + Math.max(0, Math.min(1, ratio)) * innerW
  }
  const msInRange = (ms: number) => ms >= firstMs && ms <= lastMs

  // Parse store hours "HH:MM"
  const [openH, openM] = HOURS_OPEN.split(":").map(Number)
  const [closeH, closeM] = HOURS_CLOSE.split(":").map(Number)

  // Build reference points for 24h view
  const refs: { ms: number; label: string; color: string; style: "line" | "band" }[] = []
  const bands: { startMs: number; endMs: number; label?: string }[] = []
  if (period === "24h") {
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yestMidnight = todayMidnight - 86400_000

    // Day boundary
    refs.push({ ms: todayMidnight, label: "วันใหม่", color: "#64748b", style: "line" })

    // Store hours band for today + yesterday (if visible)
    for (const baseMs of [yestMidnight, todayMidnight]) {
      const openMs = baseMs + (openH * 60 + openM) * 60_000
      const closeMs = baseMs + (closeH * 60 + closeM) * 60_000
      if (closeMs > firstMs && openMs < lastMs) {
        bands.push({
          startMs: Math.max(openMs, firstMs),
          endMs: Math.min(closeMs, lastMs),
          label: baseMs === todayMidnight ? "เวลาเปิดร้าน" : undefined,
        })
      }
    }
  }

  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-medium text-[#94a3b8] shrink-0">แนวโน้มการเข้าชม</h3>
        <div className="flex items-center gap-3 text-[10px] text-[#64748b]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400" />Views</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400" />Visitors</span>
        </div>
      </div>

      {/* Selected point readout — above chart, never overlaps */}
      <div className={`flex items-center justify-between gap-3 px-3 h-10 rounded-lg border mb-2 transition-all ${activePoint ? "bg-[#0a0a0f] border-cyan-500/40 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]" : "bg-[#0f0f18] border-[#2a2a3a] border-dashed"}`}>
        {activePoint ? (
          <>
            <div className="flex items-center gap-3 min-w-0 overflow-x-auto scrollbar-hide">
              <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] text-white font-medium whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {fmtTime(activePoint.key, period)}
                {activePoint.isToday && (
                  <span className="text-[9px] text-amber-400 font-semibold">· {period === "24h" ? "ตอนนี้" : "วันนี้"}</span>
                )}
              </span>
              <span className="shrink-0 inline-flex items-baseline gap-1 text-xs whitespace-nowrap">
                <span className="text-cyan-400 font-bold text-sm">{fmtNum(activePoint.views)}</span>
                <span className="text-[10px] text-[#94a3b8]">views</span>
              </span>
              <span className="shrink-0 inline-flex items-baseline gap-1 text-xs whitespace-nowrap">
                <span className="text-amber-400 font-bold text-sm">{fmtNum(activePoint.visitors)}</span>
                <span className="text-[10px] text-[#94a3b8]">visitors</span>
              </span>
              {activePoint.views > 0 && (
                <span className="shrink-0 text-[10px] text-[#64748b] whitespace-nowrap">
                  · {(activePoint.views / Math.max(activePoint.visitors, 1)).toFixed(1)} หน้า/คน
                </span>
              )}
            </div>
            <button
              onClick={() => setPinned(null)}
              className="shrink-0 w-6 h-6 rounded-md text-[#64748b] hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="ยกเลิกการเลือก"
              title="ยกเลิก"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <span className="text-[11px] text-[#64748b] italic">แตะจุดบนกราฟเพื่อดูข้อมูล</span>
        )}
      </div>

      <div ref={containerRef} className="w-full h-56 md:h-64 relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        className="select-none touch-manipulation cursor-pointer"
        onPointerDown={(e) => {
          const svg = svgRef.current
          if (!svg) return
          // Use SVG's native coordinate transform — handles any viewBox/aspect ratio
          const pt = svg.createSVGPoint()
          pt.x = e.clientX
          pt.y = e.clientY
          const ctm = svg.getScreenCTM()
          if (!ctm) return
          const svgPoint = pt.matrixTransform(ctm.inverse())
          // Clamp into chart area — always pick nearest data point, don't clear on tap
          const relX = Math.max(0, Math.min(innerW, svgPoint.x - PAD_L))
          const idx = Math.round((relX / innerW) * (data.length - 1))
          setPinned(Math.max(0, Math.min(data.length - 1, idx)))
        }}
      >
        <defs>
          <linearGradient id="viewsGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g, i) => (
          <line
            key={i}
            x1={PAD_L} x2={W - PAD_R}
            y1={PAD_T + innerH * (1 - g)} y2={PAD_T + innerH * (1 - g)}
            stroke="#2a2a3a" strokeWidth={0.5} strokeDasharray={i === 0 ? "" : "2 3"}
          />
        ))}

        {/* Y-axis labels */}
        {gridLines.map((g, i) => (
          <text
            key={i}
            x={PAD_L - 8} y={PAD_T + innerH * (1 - g) + 4}
            fontSize="12" fill="#94a3b8" textAnchor="end"
          >
            {fmtNum(Math.round(niceMax * g))}
          </text>
        ))}

        {/* Today column highlight — only on 7d/30d views */}
        {period !== "24h" && todayIdx >= 0 && (
          <rect
            x={x(todayIdx) - (innerW / data.length / 2.5)} y={PAD_T}
            width={innerW / data.length / 1.25} height={innerH}
            fill="#f59e0b" opacity={0.06}
          />
        )}

        {/* Store hours bands (24h view) — shaded background for 7:30–17:30 */}
        {bands.map((b, i) => {
          const x1 = xAtMs(b.startMs)
          const x2 = xAtMs(b.endMs)
          return (
            <g key={`band-${i}`}>
              <rect x={x1} y={PAD_T} width={Math.max(x2 - x1, 2)} height={innerH} fill="#10b981" opacity={0.05} />
              {b.label && (x2 - x1) > 80 && (
                <text x={(x1 + x2) / 2} y={PAD_T + 12} fontSize="11" fill="#10b981" textAnchor="middle" opacity={0.8} fontWeight="600">
                  {b.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Reference time lines (24h view) — midnight, store open/close */}
        {refs.map((r, i) => {
          if (!msInRange(r.ms)) return null
          const rx = xAtMs(r.ms)
          return (
            <g key={`ref-${i}`}>
              <line x1={rx} x2={rx} y1={PAD_T} y2={PAD_T + innerH} stroke={r.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              <text x={rx} y={PAD_T - 6} fontSize="11" fill={r.color} textAnchor="middle" opacity={0.9} fontWeight="600">
                {r.label}
              </text>
            </g>
          )
        })}

        {/* Views area fill */}
        <path d={viewsArea} fill="url(#viewsGrad)" />

        {/* Views line */}
        <path d={viewsPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Visitors line */}
        <path d={visitorsPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />

        {/* Data dots */}
        {data.map((d, i) => {
          const isPeak = i === peakIdx
          const isToday = d.isToday
          const isActive = i === active
          const r = isActive ? 5 : isPeak || isToday ? 4 : 2.5
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.views)} r={r} fill={isToday ? "#f59e0b" : "#22d3ee"} stroke="#0e0e14" strokeWidth={1.5} />
              {isActive && (
                <circle cx={x(i)} cy={y(d.views)} r={10} fill="none" stroke="#22d3ee" strokeWidth={1} opacity={0.4} />
              )}
            </g>
          )
        })}

        {/* Peak label (always visible) */}
        {peakIdx >= 0 && data[peakIdx].views > 0 && (
          <g>
            <text x={x(peakIdx)} y={y(data[peakIdx].views) - 10} fontSize="13" fill="#22d3ee" textAnchor="middle" fontWeight="700">
              {fmtNum(data[peakIdx].views)}
            </text>
          </g>
        )}

        {/* Active crosshair — vertical guide line only; data shown in strip above */}
        {activePoint && active !== null && (
          <line
            x1={x(active)} x2={x(active)}
            y1={PAD_T} y2={PAD_T + innerH}
            stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 3" opacity={0.7}
          />
        )}

        {/* X-axis labels — period-aware */}
        {(() => {
          if (period === "24h") {
            // For 24h: first, ~1/3, ~2/3, last ("ตอนนี้") — all time HH:MM
            const ticks = Array.from(new Set([
              0,
              Math.floor(data.length / 3),
              Math.floor((data.length * 2) / 3),
              data.length - 1,
            ])).sort((a, b) => a - b)
            return ticks.map((i) => {
              const isLast = i === data.length - 1
              const anchor = i === 0 ? "start" : isLast ? "end" : "middle"
              return (
                <text
                  key={i}
                  x={x(i)}
                  y={H - 10}
                  fontSize="12"
                  fill={isLast ? "#f59e0b" : "#64748b"}
                  textAnchor={anchor}
                  fontWeight={isLast ? "600" : "400"}
                >
                  {isLast ? "ตอนนี้" : fmtTime(data[i].key, period)}
                </text>
              )
            })
          }
          // 7d/30d: first, mid, last — "วันนี้" for today
          const ticks = Array.from(new Set([
            0,
            data.length >= 3 ? Math.floor(data.length / 2) : -1,
            data.length - 1,
          ].filter((i) => i >= 0))).sort((a, b) => a - b)
          return ticks.map((i) => {
            const label = fmtTime(data[i].key, period)
            const isLast = i === data.length - 1
            const anchor = i === 0 ? "start" : isLast ? "end" : "middle"
            return (
              <text
                key={i}
                x={x(i)}
                y={H - 10}
                fontSize="12"
                fill={data[i].isToday ? "#f59e0b" : "#64748b"}
                textAnchor={anchor}
                fontWeight={data[i].isToday ? "600" : "400"}
              >
                {data[i].isToday ? "วันนี้" : label}
              </text>
            )
          })
        })()}
      </svg>
      </div>

    </div>
  )
}

// ─── Hourly heatmap (unchanged core, tighter styling) ─
function HourlyHeatmap({ data }: { data: TimeseriesItem[] }) {
  if (!data?.length) return null
  const hourly = new Array(24).fill(0)
  for (const d of data) {
    const h = new Date(d.key).getHours()
    hourly[h] += d.views
  }
  const max = Math.max(...hourly, 1)
  const peakHour = hourly.indexOf(max)

  return (
    <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[#94a3b8]">ช่วงเวลาที่มีคนเข้าชม</h3>
        <span className="text-[10px] text-[#64748b]">peak: <span className="text-amber-400 font-medium">{String(peakHour).padStart(2, "0")}:00</span></span>
      </div>
      <div className="flex gap-0.5">
        {hourly.map((v, h) => {
          const intensity = max > 0 ? v / max : 0
          const isPeak = h === peakHour && v > 0
          return (
            <div key={h} className="flex-1 flex flex-col items-center group relative">
              <div
                className={`w-full h-10 rounded-sm transition-colors ${isPeak ? "ring-1 ring-amber-400/60" : ""}`}
                style={{ backgroundColor: `rgba(34,211,238,${0.08 + intensity * 0.8})` }}
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
        <span className="text-[9px] text-[#64748b]">00</span>
        <span className="text-[9px] text-[#64748b]">06</span>
        <span className="text-[9px] text-[#64748b]">12</span>
        <span className="text-[9px] text-[#64748b]">18</span>
        <span className="text-[9px] text-[#64748b]">23</span>
      </div>
    </div>
  )
}

// ─── Today snapshot (visible on 24h period) ───────────
function TodaySnapshot({ data }: { data: TimeseriesItem[] }) {
  const snap = useMemo(() => {
    if (!data?.length) return null
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = new Date(todayStart - 24 * 3600_000).getTime()
    const yesterdayEnd = todayStart
    const thisHour = new Date(now).getHours()

    let todayViews = 0, thisHourViews = 0, yestSameViews = 0
    let hourlyToday: number[] = new Array(24).fill(0)
    let hourlyPrevDays: number[][] = []  // rolling baseline for stddev
    const byDay = new Map<string, number[]>()

    for (const d of data) {
      const t = new Date(d.key).getTime()
      const h = new Date(d.key).getHours()
      const dayKey = new Date(d.key).toDateString()
      if (!byDay.has(dayKey)) byDay.set(dayKey, new Array(24).fill(0))
      byDay.get(dayKey)![h] += d.views

      if (t >= todayStart) {
        todayViews += d.views
        hourlyToday[h] += d.views
        if (h === thisHour) thisHourViews += d.views
      } else if (t >= yesterday && t < yesterdayEnd) {
        const yh = new Date(d.key).getHours()
        if (yh <= thisHour) yestSameViews += d.views  // yesterday up to same time
      }
    }

    // Build baseline: last 7 days excluding today, hourly mean + stddev
    const prevDayArrays = Array.from(byDay.entries())
      .filter(([k]) => new Date(k).getTime() < todayStart)
      .slice(-7)
      .map(([, arr]) => arr)

    const spikes: { hour: number; views: number; baseline: number }[] = []
    if (prevDayArrays.length >= 2) {
      for (let h = 0; h <= thisHour; h++) {
        const samples = prevDayArrays.map((arr) => arr[h])
        const mean = samples.reduce((s, v) => s + v, 0) / samples.length
        const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length
        const std = Math.sqrt(variance)
        const threshold = mean + 2 * std
        if (hourlyToday[h] > threshold && hourlyToday[h] > mean * 1.5 && hourlyToday[h] >= 10) {
          spikes.push({ hour: h, views: hourlyToday[h], baseline: Math.round(mean) })
        }
      }
    }
    hourlyPrevDays = prevDayArrays

    const peakHourToday = hourlyToday.indexOf(Math.max(...hourlyToday))
    const peakViewsToday = hourlyToday[peakHourToday] || 0

    return {
      todayViews,
      thisHourViews,
      yestSameViews,
      peakHourToday,
      peakViewsToday,
      spikes,
      hasBaseline: hourlyPrevDays.length >= 2,
    }
  }, [data])

  if (!snap) return null
  const vsYesterday = deltaPct(snap.todayViews, snap.yestSameViews)

  return (
    <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-3 md:p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">📈</span>
          <h3 className="text-sm font-medium text-white">วันนี้ — {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</h3>
        </div>
        <span className="text-[9px] text-[#64748b]">refresh ทุก 60 วินาที</span>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div>
          <div className="text-[10px] text-[#64748b] mb-0.5">Views วันนี้</div>
          <div className="text-lg md:text-xl font-bold text-amber-400 leading-none">{fmtNum(snap.todayViews)}</div>
          {vsYesterday !== null && snap.yestSameViews > 0 && (
            <div className="mt-1"><DeltaPill delta={vsYesterday} /></div>
          )}
        </div>
        <div>
          <div className="text-[10px] text-[#64748b] mb-0.5">ชั่วโมงนี้</div>
          <div className="text-lg md:text-xl font-bold text-white leading-none">{fmtNum(snap.thisHourViews)}</div>
          <div className="text-[9px] text-[#64748b] mt-1">{String(new Date().getHours()).padStart(2, "0")}:00 — ปัจจุบัน</div>
        </div>
        <div>
          <div className="text-[10px] text-[#64748b] mb-0.5">peak วันนี้</div>
          <div className="text-lg md:text-xl font-bold text-white leading-none">{fmtNum(snap.peakViewsToday)}</div>
          <div className="text-[9px] text-[#64748b] mt-1">{String(snap.peakHourToday).padStart(2, "0")}:00</div>
        </div>
      </div>
      {snap.spikes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-500/10">
          <div className="text-[10px] text-amber-400/80 mb-1">📣 ตรวจจับ spike</div>
          <div className="flex flex-wrap gap-1.5">
            {snap.spikes.slice(-3).map((s) => (
              <span key={s.hour} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 whitespace-nowrap">
                {String(s.hour).padStart(2, "0")}:00 — <span className="font-bold">{fmtNum(s.views)}</span> (ปกติ {s.baseline})
              </span>
            ))}
          </div>
        </div>
      )}
      {!snap.hasBaseline && snap.todayViews > 0 && (
        <div className="mt-2 text-[9px] text-[#64748b]">* ยังไม่มี baseline 2 วันสำหรับ spike detection</div>
      )}
    </div>
  )
}

// ─── Guide modal — step-by-step cards ─────────────────
interface GuideStep {
  icon: string
  title: string
  subtitle?: string
  body: React.ReactNode
}

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: "👋",
    title: "สถิติเว็บไซต์คืออะไร",
    subtitle: "ก่อนเริ่ม ทำความเข้าใจภาพรวม",
    body: (
      <>
        <p>
          หน้านี้บอกว่า <b className="text-white">ใครเข้าเว็บเรา เมื่อไหร่ เข้ากี่คน</b>
          {" "}และ <b className="text-white">มาจากไหน</b> — ใช้ดูว่าการโฆษณาหรือการโพสต์ที่เราทำไป <b>ได้ผลไหม</b>
        </p>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-cyan-400 mb-1">ข้อมูลมาจากไหน?</div>
          <p className="text-[#cbd5e1]">
            จาก <b>Vercel Web Analytics</b> ระบบนับคนเข้าเว็บแบบไม่เก็บข้อมูลส่วนตัว
            — <b className="text-emerald-400">ไม่มี cookies</b> ปลอดภัยตามกฎหมาย
          </p>
        </div>
        <p className="text-[#64748b] mt-3">ข้อมูลอัปเดตทุก 60 วินาที — คู่มือนี้มี 10 หน้า จะพาไปทีละเรื่อง</p>
      </>
    ),
  },
  {
    icon: "📄",
    title: "Page Views — ยอดเปิดหน้า",
    subtitle: "หน้าแรก · ตัวเลขสีฟ้า",
    body: (
      <>
        <p>
          <b className="text-cyan-400">Page Views</b> = <b className="text-white">จำนวนครั้งที่หน้าเว็บถูกเปิด</b>
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3">
          <div className="text-[#94a3b8] mb-2 font-bold">ตัวอย่าง:</div>
          <p className="text-[#cbd5e1]">
            <b>คุณสมศรี</b>เปิดหน้าแรก → ดูหน้าสินค้าสี → กลับมาหน้าแรก → ดูหน้าโปรโมชั่น
          </p>
          <p className="mt-2 text-cyan-400"><b>= 4 Views (4 ครั้ง)</b></p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-amber-400 mb-1">💡 บอกอะไรเรา?</div>
          <p className="text-[#cbd5e1]">
            ยิ่งเยอะ = มีคนสนใจเปิดดูหน้าต่างๆ ในเว็บ ถ้าตัวเลขขึ้นหลังโพสต์หรือยิงโฆษณา = ได้ผล
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "👥",
    title: "Visitors — จำนวนคนจริงๆ",
    subtitle: "ตัวเลขสีเหลือง",
    body: (
      <>
        <p>
          <b className="text-amber-400">Visitors</b> = <b className="text-white">จำนวนคนที่ไม่ซ้ำกัน</b>
          {" "}(นับเป็นคนเดียว ไม่ว่าจะเปิดกี่หน้า)
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3">
          <div className="text-[#94a3b8] mb-2 font-bold">ตัวอย่าง:</div>
          <p className="text-[#cbd5e1]">
            คุณสมศรีในตัวอย่างที่แล้วเปิดไป 4 หน้า
          </p>
          <p className="mt-2">
            <span className="text-cyan-400"><b>4 Views</b></span> แต่ <span className="text-amber-400"><b>1 Visitor</b></span>
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-emerald-400 mb-1">🎯 ต่างกันยังไง?</div>
          <ul className="space-y-1 text-[#cbd5e1] list-disc pl-5 marker:text-emerald-400">
            <li><b>Views</b> บอก "เปิดหน้ากี่ครั้ง"</li>
            <li><b>Visitors</b> บอก "มีกี่คนมาจริงๆ" <b className="text-white">(สำคัญกว่า!)</b></li>
          </ul>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-cyan-400 mb-1">🧮 เคล็ดลับ</div>
          <p className="text-[#cbd5e1]">
            เอา <b>Views ÷ Visitors</b> = แต่ละคนเฉลี่ยเปิดกี่หน้า
            <br />
            <span className="text-[#94a3b8]">เช่น Views 100 ÷ Visitors 30 ≈ คนละ 3 หน้า — ถ้าได้ 3+ แปลว่าคนสนใจ เปิดดูหลายหน้า</span>
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "🚪",
    title: "Bounce Rate — อัตราเด้งออก",
    subtitle: "ตัวเลขสีเขียว/ส้ม",
    body: (
      <>
        <p>
          <b className="text-emerald-400">Bounce Rate</b> = <b className="text-white">เปอร์เซ็นต์ของคนที่เข้ามาดูแค่หน้าเดียวแล้วปิดไปเลย</b>
          {" "}ไม่กดดูหน้าอื่นต่อ
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3">
          <div className="text-[#94a3b8] mb-2 font-bold">ตัวอย่าง:</div>
          <p className="text-[#cbd5e1]">
            มี 100 คนเข้าเว็บ — 60 คนดูหน้าเดียวแล้วออก = Bounce Rate <b className="text-amber-400">60%</b>
          </p>
        </div>
        <div className="mt-4">
          <div className="font-bold text-white mb-2">ตัวเลขดีไหม?</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
              <div className="text-emerald-400 font-bold text-base">&lt; 40%</div>
              <div className="text-[#cbd5e1] text-xs mt-1">ดีมาก</div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
              <div className="text-cyan-400 font-bold text-base">40–60%</div>
              <div className="text-[#cbd5e1] text-xs mt-1">ปกติ</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
              <div className="text-amber-400 font-bold text-base">60–80%</div>
              <div className="text-[#cbd5e1] text-xs mt-1">ควรปรับปรุง</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-red-400 font-bold text-base">&gt; 80%</div>
              <div className="text-[#cbd5e1] text-xs mt-1">แย่</div>
            </div>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-red-400 mb-1">⚠ Bounce สูงเกินไป = อะไร?</div>
          <p className="text-[#cbd5e1]">
            คนเจอเว็บเรา แต่พออ่านแล้วไม่สนใจ ปิดไปทันที
            {" "}อาจเป็นเพราะ <b>หน้าโหลดช้า</b>, <b>ข้อมูลไม่ตรงใจ</b>, หรือ <b>ยิงโฆษณาดึงคนผิดกลุ่ม</b>
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "🏆",
    title: "Peak — จุดพีคสูงสุด",
    subtitle: "ช่วงเวลาที่คนเข้ามาเยอะที่สุด",
    body: (
      <>
        <p>
          <b className="text-white">Peak</b> = <b>ชั่วโมง (หรือวัน) ที่มีคนเข้ามาเยอะที่สุด</b>ในช่วงที่เราดูอยู่
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3">
          <div className="text-[#94a3b8] mb-2 font-bold">ตัวอย่าง:</div>
          <p className="text-[#cbd5e1]">
            ดู 7 วันที่ผ่านมา — peak = <b>46 views</b> ที่ <b className="text-amber-400">16 เม.ย.</b>
          </p>
          <p className="text-[#94a3b8] mt-2">แปลว่าวันที่ 16 เป็นวันที่คนเข้าเยอะที่สุด</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-amber-400 mb-1">💰 ใช้ Peak ทำอะไรได้?</div>
          <ul className="space-y-1 text-[#cbd5e1] list-disc pl-5 marker:text-amber-400">
            <li><b>เลือกเวลาโพสต์</b> Facebook/LINE ในช่วง peak → คนเห็นเยอะสุด</li>
            <li><b>ยิงโฆษณา</b>ก่อน peak ~30 นาที → คนกำลังจะออนไลน์</li>
            <li><b>เตรียมตอบลูกค้า</b>ให้เร็วขึ้นในช่วง peak</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    icon: "📈",
    title: "ป้าย ↑% ↓% — เทียบกับครั้งก่อน",
    subtitle: "ตัวเลขเล็กๆ ข้างตัวเลขหลัก",
    body: (
      <>
        <p>
          ป้าย <b className="text-emerald-400">↑21%</b> หรือ <b className="text-red-400">↓5%</b>
          {" "}ที่เห็นข้างตัวเลข = <b className="text-white">เทียบกับช่วงก่อนหน้าที่เท่ากัน</b>
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-3">
            <div className="text-[#94a3b8] text-xs mb-1">ดู "7 วัน"</div>
            <div className="text-white">เทียบกับ <b>7 วันก่อนหน้านั้น</b></div>
          </div>
          <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-3">
            <div className="text-[#94a3b8] text-xs mb-1">ดู "24 ชม."</div>
            <div className="text-white">เทียบกับ <b>24 ชม. ก่อน</b></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold">↑ = เพิ่มขึ้น (ดี)</span>
          <span className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 font-bold">↓ = ลดลง (ต้องดู)</span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-500/15 text-slate-400 font-bold">— = เท่าเดิม</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-amber-400 mb-1">⚠ ยกเว้น Bounce Rate!</div>
          <p className="text-[#cbd5e1]">
            Bounce Rate กลับด้าน — <b className="text-emerald-400">ลดลง = ดี</b> (คนอยู่นานขึ้น ไม่เด้งออก)
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "📊",
    title: "กราฟแนวโน้มการเข้าชม",
    subtitle: "กราฟหลักกลางหน้า",
    body: (
      <>
        <p>แสดงจำนวนคนเข้าเว็บตามเวลา — <b className="text-white">ดูได้ว่าช่วงไหนดีไม่ดี</b></p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-0.5 bg-cyan-400 shrink-0" />
            <span className="text-[#cbd5e1]"><b className="text-cyan-400">เส้นทึบฟ้า</b> = Page Views</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-0 shrink-0 border-t-2 border-dashed border-amber-400" />
            <span className="text-[#cbd5e1]"><b className="text-amber-400">เส้นประเหลือง</b> = Visitors</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-amber-400 shrink-0 ring-2 ring-[#1a1a28]" />
            <span className="text-[#cbd5e1]">จุด <b className="text-amber-400">สีส้ม</b> = วันนี้ / ตอนนี้</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-4 shrink-0 rounded" style={{ backgroundColor: "rgba(16,185,129,0.15)" }} />
            <span className="text-[#cbd5e1]">แถบ<b className="text-emerald-400">สีเขียวจางๆ</b> = เวลาเปิดร้าน (7:30–17:30)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-4 shrink-0 flex items-center"><div className="w-full h-full border-l-2 border-dashed border-[#64748b]" /></div>
            <span className="text-[#cbd5e1]">เส้นประเทา "วันใหม่" = แบ่งวันเก่ากับวันใหม่</span>
          </div>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-cyan-400 mb-1">💡 ใช้ยังไง?</div>
          <p className="text-[#cbd5e1]">
            <b>แตะที่กราฟ</b> เพื่อดูตัวเลขเวลาไหนก็ได้ — ตัวเลขสีฟ้าเด่นบนกราฟคือ peak
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "🕐",
    title: "แถบชั่วโมง — คนเข้าเยอะช่วงไหน",
    subtitle: "กราฟล่างสุด 24 ช่วงเวลา",
    body: (
      <>
        <p>
          แถบ 24 ช่อง แต่ละช่อง = <b className="text-white">1 ชั่วโมงของวัน</b>
          {" "}(00:00 – 23:00)
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3">
          <div className="text-[#94a3b8] mb-2 font-bold">วิธีอ่าน:</div>
          <ul className="space-y-2 text-[#cbd5e1]">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold shrink-0">เข้มสุด =</span>
              <span>ชั่วโมงที่มีคนเข้าเยอะที่สุด</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#64748b] font-bold shrink-0">จางสุด =</span>
              <span>ชั่วโมงที่แทบไม่มีคนเข้า</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">ขอบส้ม =</span>
              <span>peak (ชั่วโมงสูงสุด)</span>
            </li>
          </ul>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-emerald-400 mb-1">💰 ใช้วางแผนธุรกิจยังไง?</div>
          <ul className="space-y-1 text-[#cbd5e1] list-disc pl-5 marker:text-emerald-400">
            <li>รู้ช่วงเวลาที่คนเข้ามากที่สุด → <b>โพสต์</b> หรือ<b>ยิงโฆษณา</b>ตอนนั้น</li>
            <li>เช่น peak 14:00–18:00 = คนค้นของใช้บ้านหลังเลิกงาน</li>
            <li>ถ้า peak นอกเวลาเปิดร้าน → เตรียมแชทบอตรอ หรือตอบทันทีเช้า</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    icon: "📣",
    title: "การ์ด \"วันนี้\" — ดูสดตอนนี้",
    subtitle: "แสดงเฉพาะโหมด 24 ชม.",
    body: (
      <>
        <p>
          การ์ดสีส้มด้านบน = <b className="text-white">สถิติวันนี้แบบเรียลไทม์</b>
          {" "}(อัปเดตทุก 60 วินาที)
        </p>
        <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-xl p-4 mt-3 space-y-3">
          <div>
            <div className="text-amber-400 font-bold">Views วันนี้</div>
            <p className="text-[#cbd5e1] mt-1">
              รวมทั้งวัน + เทียบกับ<b>เมื่อวานเวลาเดียวกัน</b>
              <br />
              <span className="text-[#94a3b8]">→ ใช้เช็คว่าวันนี้ดีกว่าเมื่อวานไหม</span>
            </p>
          </div>
          <div className="pt-3 border-t border-white/5">
            <div className="text-white font-bold">ชั่วโมงนี้</div>
            <p className="text-[#cbd5e1] mt-1">
              Views ใน<b>ชั่วโมงปัจจุบัน</b>เท่านั้น
              <br />
              <span className="text-[#94a3b8]">→ ดูสดว่ามีคนเข้ามาช่วงนี้กี่คน</span>
            </p>
          </div>
          <div className="pt-3 border-t border-white/5">
            <div className="text-white font-bold">Peak วันนี้</div>
            <p className="text-[#cbd5e1] mt-1">ชั่วโมงสูงสุดของวันนี้ (เฉพาะวันนี้)</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-red-400 mb-1">🚨 ระบบเตือนอัตโนมัติ</div>
          <p className="text-[#cbd5e1]">
            ถ้าชั่วโมงไหนมีคน<b>เข้าเยอะผิดปกติ</b> (เทียบกับ 7 วันย้อนหลัง) → แสดง pill สีส้มให้ดู
          </p>
          <p className="text-[#94a3b8] mt-2 text-xs">
            เช่น: <b className="text-amber-400">10:00 — 28 views (ปกติ 5)</b> = อาจเป็นเพราะคุณเพิ่งโพสต์ หรือยิงโฆษณาในช่วงนั้น
          </p>
        </div>
      </>
    ),
  },
  {
    icon: "🎯",
    title: "เคล็ดลับใช้งานจริง",
    subtitle: "จบแล้ว! เช็คลิสต์ก่อนใช้จริง",
    body: (
      <>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="font-bold text-amber-400 mb-2">หลังยิงโฆษณา ดู 3 อย่าง:</div>
          <ol className="space-y-2 text-[#cbd5e1] list-decimal pl-5 marker:text-amber-400">
            <li><b className="text-white">Views/Visitors ขึ้นไหม?</b> → โฆษณาดึงคนเข้าได้</li>
            <li><b className="text-white">Bounce Rate สูงขึ้นไหม?</b> → ถ้าสูงขึ้นมาก = โฆษณาดึงคนผิดกลุ่ม</li>
            <li><b className="text-white">Views ÷ Visitors ลดไหม?</b> → ถ้าลด = คนเข้ามาดูแค่หน้าเดียวแล้วไป</li>
          </ol>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-cyan-400 mb-2">ค่าปกติของร้านวัสดุก่อสร้าง</div>
          <ul className="space-y-1 text-[#cbd5e1] list-disc pl-5 marker:text-cyan-400">
            <li>Views/Visitor: <b>2–4 หน้าต่อคน</b></li>
            <li>Bounce Rate: <b>40–60%</b></li>
            <li>Peak: ช่วงเย็น <b>18:00–21:00</b> (หลังเลิกงาน)</li>
          </ul>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-3">
          <div className="font-bold text-red-400 mb-1">⚠ ระวัง!</div>
          <p className="text-[#cbd5e1]">
            วันหยุดยาว / เทศกาล (สงกรานต์, ปีใหม่) อาจทำให้ตัวเลขแปลก
            {" "}— อย่าตกใจถ้าตัวเลขตกลงในช่วงนั้น ไม่ได้แปลว่าการตลาดล้มเหลวเสมอไป
          </p>
        </div>
      </>
    ),
  },
]

const GUIDE_STORAGE_KEY = "analytics-guide-step"

function GuideModal({ onClose }: { onClose: () => void }) {
  // Resume where user left off (persisted across close/reopen)
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 0
    try {
      const saved = window.localStorage.getItem(GUIDE_STORAGE_KEY)
      const n = saved ? parseInt(saved, 10) : 0
      return Number.isNaN(n) || n < 0 || n >= GUIDE_STEPS.length ? 0 : n
    } catch {
      return 0
    }
  })
  const total = GUIDE_STEPS.length
  const current = GUIDE_STEPS[step]
  const isFirst = step === 0
  const isLast = step === total - 1

  // Persist current step on every change
  useEffect(() => {
    try { window.localStorage.setItem(GUIDE_STORAGE_KEY, String(step)) } catch {}
  }, [step])

  // "เสร็จแล้ว" → clear progress so next open starts fresh at step 0
  const handleFinish = () => {
    try { window.localStorage.removeItem(GUIDE_STORAGE_KEY) } catch {}
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight" && !isLast) setStep((s) => s + 1)
      if (e.key === "ArrowLeft" && !isFirst) setStep((s) => s - 1)
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, isFirst, isLast])

  const bodyRef = useRef<HTMLDivElement>(null)
  // Scroll body to top on step change
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-[#13131d] border border-[#2a2a3a] w-full md:max-w-2xl md:max-h-[88vh] max-h-[94vh] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header with progress */}
        <div className="shrink-0 px-4 md:px-6 pt-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-400 text-lg shrink-0">📖</span>
              <h2 className="text-base font-bold text-white truncate">คู่มืออ่านสถิติ</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-[#64748b] tabular-nums">
                {step + 1}<span className="text-[#475569]"> / {total}</span>
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="ปิด"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Body — one step card at a time */}
        <div ref={bodyRef} className="overflow-y-auto flex-1 th-text">
          <div className="px-4 md:px-6 py-5 md:py-6">
            {/* Step card hero */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl shrink-0">
                {current.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{current.title}</h3>
                {current.subtitle && (
                  <p className="text-sm text-[#94a3b8] mt-1">{current.subtitle}</p>
                )}
              </div>
            </div>

            {/* Step content */}
            <div className="text-sm md:text-[15px] leading-relaxed text-[#cbd5e1] space-y-2">
              {current.body}
            </div>
          </div>
        </div>

        {/* Navigation footer */}
        <div className="shrink-0 px-4 md:px-6 py-3 border-t border-white/5 bg-[#0f0f18] flex items-center gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="h-11 px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-[#94a3b8] hover:text-white hover:bg-white/5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            ก่อนหน้า
          </button>

          {/* Step dots (desktop only) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-1.5">
            {GUIDE_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === step ? "w-6 bg-amber-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`ไปหน้า ${i + 1}`}
              />
            ))}
          </div>
          <div className="md:hidden flex-1" />

          <button
            onClick={() => isLast ? handleFinish() : setStep((s) => Math.min(total - 1, s + 1))}
            className={`h-11 px-5 rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              isLast
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
            }`}
          >
            {isLast ? (
              <>
                เสร็จแล้ว
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                อ่านต่อ
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
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
  const [showGuide, setShowGuide] = useState(false)

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

  // Auto-refresh today snapshot every 60s when on 24h view
  useEffect(() => {
    if (period !== "24h") return
    const id = setInterval(() => fetchData("24h"), 60_000)
    return () => clearInterval(id)
  }, [period, fetchData])

  const s = data?.summary
  const ts = data?.timeseries || []

  // Build chart points — hourly for 24h (last point = "now"), daily for 7d/30d
  const chartPoints: ChartPoint[] = useMemo(() => {
    if (!ts.length) return []
    const today = new Date()
    if (period === "24h") {
      const mapped = ts.map((d) => ({ key: d.key, views: d.views, visitors: d.visitors, isToday: false }))
      if (mapped.length > 0) mapped[mapped.length - 1].isToday = true  // marks "ตอนนี้"
      return mapped
    }
    const dayMap = new Map<string, { views: number; visitors: number; key: string }>()
    for (const d of ts) {
      const day = d.key.slice(0, 10)
      const existing = dayMap.get(day) || { views: 0, visitors: 0, key: d.key }
      existing.views += d.views
      existing.visitors += d.visitors
      dayMap.set(day, existing)
    }
    return Array.from(dayMap.values()).map((v) => ({
      key: v.key, views: v.views, visitors: v.visitors,
      isToday: isSameDay(v.key, today),
    }))
  }, [ts, period])

  // Sparkline data (last 10 points of chart)
  const sparkViews = chartPoints.slice(-10).map((d) => d.views)
  const sparkVisitors = chartPoints.slice(-10).map((d) => d.visitors)

  const deltaViews = s?.prev ? deltaPct(s.totalViews, s.prev.totalViews) : null
  const deltaVisitors = s?.prev ? deltaPct(s.totalVisitors, s.prev.totalVisitors) : null
  const deltaBounce = s?.prev ? deltaPct(s.avgBounceRate, s.prev.avgBounceRate) : null

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-white whitespace-nowrap">Analytics</h1>
          <button
            onClick={() => fetchData(period)}
            className="shrink-0 w-9 h-9 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            title="รีเฟรช"
            aria-label="รีเฟรช"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="shrink-0 h-9 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 text-xs font-medium whitespace-nowrap"
            title="คู่มืออ่านค่า Analytics"
            aria-label="คู่มือ"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            คู่มือ
          </button>
        </div>
        <div className="flex gap-0.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`h-8 px-2.5 md:px-3 rounded-md text-[11px] md:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                period === p.value ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "text-[#64748b] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
            <div className="h-28 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
          </div>
          <div className="h-52 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error */}
      {!loading && (!data?.configured || data?.error) && (
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-6 md:p-8 text-center">
          {data?.dashboardOnly ? (
            <>
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm text-white font-medium mb-2">ข้อมูล Analytics ดูได้ที่ Vercel Dashboard</p>
              <p className="text-xs text-[#94a3b8] mb-4 max-w-md mx-auto leading-relaxed">
                Vercel ไม่เปิด API ให้ดึงข้อมูล Web Analytics ด้วย access token (ยังไม่มี public API)
                จึงต้องเปิดดูในหน้า Dashboard โดยตรง — ข้อมูลครบกว่าและเป็นปัจจุบัน
              </p>
              {data?.dashboardUrl && (
                <a
                  href={data.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-sm font-medium transition-colors cursor-pointer"
                >
                  เปิด Vercel Analytics
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-[#64748b] mb-2">ยังไม่สามารถดึงข้อมูล Analytics ได้</p>
              {data?.error && <p className="text-xs text-red-400/70 mt-2 font-mono break-all">{data.error}</p>}
              <p className="text-xs text-[#475569] mt-2">ตรวจสอบว่าเปิด Web Analytics ใน Vercel Dashboard แล้ว</p>
            </>
          )}
        </div>
      )}

      {/* Data */}
      {!loading && data?.configured && !data?.error && s && (
        <>
          {/* Today snapshot — only on 24h period */}
          {period === "24h" && <TodaySnapshot data={ts} />}

          {/* Primary KPIs (Views + Visitors) — larger */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <KpiCard
              label="Page Views"
              value={s.totalViews}
              color="cyan"
              delta={deltaViews}
              sparkline={{ values: sparkViews, color: "#22d3ee" }}
              sub={s.prev ? `ก่อนหน้า: ${fmtNum(s.prev.totalViews)}` : PERIODS.find((p) => p.value === period)?.label}
            />
            <KpiCard
              label="Visitors"
              value={s.totalVisitors}
              color="amber"
              delta={deltaVisitors}
              sparkline={{ values: sparkVisitors, color: "#f59e0b" }}
              sub={s.prev ? `ก่อนหน้า: ${fmtNum(s.prev.totalVisitors)}` : "จำนวนอุปกรณ์"}
            />
          </div>

          {/* Secondary KPIs (Bounce + Peak) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiCard
              label="Bounce Rate"
              value={`${s.avgBounceRate}%`}
              color={s.avgBounceRate > 70 ? "amber" : "emerald"}
              delta={deltaBounce}
              invertDelta
              sub={s.prev ? `ก่อนหน้า: ${s.prev.avgBounceRate}%` : "เฉลี่ย"}
            />
            <KpiCard
              label="Peak"
              value={s.peakViews}
              color="white"
              sub={s.peakTime ? fmtTime(s.peakTime, period) : "-"}
            />
          </div>

          {/* Main chart */}
          <div className="mb-4">
            <LineChart data={chartPoints} period={period} />
          </div>

          {/* Hourly heatmap */}
          <div className="mb-4">
            <HourlyHeatmap data={ts} />
          </div>

          {/* Footer */}
          <div className="text-[10px] text-[#475569] text-center">
            ข้อมูลจาก Vercel Web Analytics — {s.dataPoints} data points · cache 60 วินาที
          </div>
        </>
      )}

      {/* Guide modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}
