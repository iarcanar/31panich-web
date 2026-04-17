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

// ─── Guide modal ──────────────────────────────────────
function GuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    // Lock body scroll while modal open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-[#13131d] border border-[#2a2a3a] w-full md:max-w-2xl md:max-h-[85vh] max-h-[92vh] rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-400 text-lg">📖</span>
            <h2 className="text-sm md:text-base font-bold text-white truncate">คู่มืออ่านค่า Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto flex-1 px-4 md:px-5 py-4 space-y-5 th-text text-[13px] leading-relaxed text-[#cbd5e1]">
          {/* Intro */}
          <p className="text-xs text-[#94a3b8]">
            หน้านี้แสดงสถิติผู้เข้าชมเว็บไซต์จาก <span className="text-cyan-400">Vercel Web Analytics</span> —
            ข้อมูลอัปเดตทุก 60 วินาที ใช้ประเมินผลการตลาด (ยิง ads, โพสต์ Facebook, ทำ SEO)
          </p>

          {/* Section: KPI */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">📊 ตัวเลขหลัก 4 ตัว</h3>
            <div className="space-y-3">
              <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-bold text-cyan-400">Page Views</span>
                  <span className="text-[11px] text-[#64748b]">= ยอดกดดูหน้า</span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  นับทุกครั้งที่หน้าเว็บถูกเปิด — คน 1 คนเปิด 5 หน้า = 5 views
                  <br />
                  <span className="text-[#64748b]">📈 ตัวชี้วัดปริมาณ traffic โดยรวม</span>
                </p>
              </div>

              <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold text-amber-400">Visitors</span>
                  <span className="text-[11px] text-[#64748b]">= จำนวนคน (อุปกรณ์)</span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  นับเฉพาะอุปกรณ์ที่ไม่ซ้ำ — คน 1 คนเปิดกี่หน้าก็นับ 1
                  <br />
                  <span className="text-[#64748b]">👥 ตัวชี้วัด "เข้าถึงกี่คนจริงๆ" — สำคัญกว่า views เพราะสะท้อนฐานลูกค้า</span>
                </p>
                <div className="mt-2 text-[11px] text-cyan-400/80 bg-cyan-500/10 rounded px-2 py-1">
                  💡 <b>Views ÷ Visitors</b> = หน้าที่คนเปิดเฉลี่ย — ถ้า ~3 ขึ้นไป = คนสนใจเว็บ เปิดดูหลายหน้า
                </div>
              </div>

              <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-emerald-400">Bounce Rate</span>
                  <span className="text-[11px] text-[#64748b]">= อัตราเด้งออก</span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  % คนที่เข้ามาแล้วออกเลย ไม่ได้กดดูหน้าอื่น
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">&lt; 40% ดีมาก</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400">40–60% ปกติ</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">60–80% ควรปรับ</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400">&gt; 80% แย่</span>
                </div>
                <p className="mt-2 text-[11px] text-[#64748b]">
                  Bounce สูง = คนเข้ามาไม่เจอสิ่งที่ต้องการ อาจต้องแก้ landing page หรือ ads ไม่ตรงกลุ่ม
                </p>
              </div>

              <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="font-bold text-white">Peak</span>
                  <span className="text-[11px] text-[#64748b]">= ยอดสูงสุดต่อชั่วโมง/วัน</span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  ชั่วโมง (หรือวัน) ที่มีคนเข้าเยอะที่สุดในช่วงที่ดู → ใช้วางแผนเวลาโพสต์ content หรือยิง ads
                </p>
              </div>
            </div>
          </section>

          {/* Section: Delta */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">↑ ป้ายเปอร์เซ็นต์ (Delta)</h3>
            <p className="text-xs text-[#94a3b8] mb-2">
              ตัวเลข % ข้างตัวเลขหลัก = เปรียบเทียบช่วงก่อนหน้าที่ยาวเท่ากัน
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#1a1a28] rounded-lg p-2">
                <div className="text-[#64748b] mb-1">ดู "7 วัน"</div>
                <div className="text-white">เทียบกับ 7 วันก่อนหน้านั้น</div>
              </div>
              <div className="bg-[#1a1a28] rounded-lg p-2">
                <div className="text-[#64748b] mb-1">ดู "24 ชม."</div>
                <div className="text-white">เทียบกับ 24 ชม. ก่อนหน้า</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">↑ เพิ่มขึ้น (ดี)</span>
              <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400">↓ ลดลง (แย่)</span>
              <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-400">— เท่าเดิม</span>
            </div>
            <p className="mt-2 text-[11px] text-[#64748b]">
              ⚠ Bounce Rate กลับด้าน — <span className="text-emerald-400">ลดลง = ดี</span> (คนอยู่นานขึ้น)
            </p>
          </section>

          {/* Section: Chart */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">📈 กราฟแนวโน้ม</h3>
            <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3 space-y-2 text-xs text-[#94a3b8]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-cyan-400 shrink-0" />
                <span><b className="text-cyan-400">เส้นทึบฟ้า</b> = Page Views (พร้อม area fill)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-amber-400 shrink-0" style={{ borderTop: "2px dashed #f59e0b", background: "none" }} />
                <span><b className="text-amber-400">เส้นประเหลือง</b> = Visitors</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 ring-2 ring-[#13131d]" />
                <span>จุด <b className="text-amber-400">amber ใหญ่</b> + คอลัมน์เหลืองจางๆ = <b>วันนี้</b></span>
              </div>
              <div className="text-[11px] text-[#64748b] pt-1 border-t border-white/5">
                💡 <b>แตะที่กราฟ</b> เพื่อดูตัวเลขเวลาไหนก็ได้ — ตัวเลขเหนือจุดสูงสุดเป็น peak
              </div>
            </div>
          </section>

          {/* Section: Heatmap */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">🕐 ช่วงเวลาที่มีคนเข้าชม</h3>
            <p className="text-xs text-[#94a3b8] mb-2">
              แถบสี 24 ช่วงเวลา — เข้มสุด = ชั่วโมงที่คนเข้าเยอะที่สุด (มีขอบ amber)
            </p>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 text-xs">
              <div className="text-cyan-400 font-bold mb-1">💰 ใช้วางแผนการตลาด</div>
              <ul className="space-y-1 text-[#94a3b8] text-[11px] pl-4 list-disc marker:text-cyan-400">
                <li>ยิง ads 30 นาที <b>ก่อน peak</b> → คนเห็น ads ตอนกำลังจะออนไลน์</li>
                <li>โพสต์ Facebook/Line ช่วง peak → engagement สูงสุด</li>
                <li>ถ้า peak = 18:00-20:00 แสดงว่าคนเข้ามาช่วงพักผ่อน → content ควรอ่านง่าย ตัดสินใจซื้อเร็ว</li>
              </ul>
            </div>
          </section>

          {/* Section: Today + Spike */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">📣 การ์ด "วันนี้" (โหมด 24 ชม.)</h3>
            <div className="bg-[#1a1a28] border border-[#2a2a3a] rounded-lg p-3 text-xs text-[#94a3b8] space-y-2">
              <div><b className="text-white">Views วันนี้</b> + <b className="text-emerald-400">↑% vs เมื่อวาน</b> เวลาเดียวกัน → รู้ทันทีว่า ads วันนี้ "ได้ผล" ไหม</div>
              <div><b className="text-white">ชั่วโมงนี้</b> = views ในชั่วโมงปัจจุบันเท่านั้น (อัปเดตทุก 60 วินาที)</div>
              <div className="pt-2 border-t border-white/5">
                <div className="font-bold text-amber-400 mb-1">🚨 ตรวจจับ spike</div>
                <p className="text-[11px]">
                  ถ้าชั่วโมงไหน views <b>สูงกว่าค่าเฉลี่ย 7 วันมาก</b> (เกิน 2 standard deviation และอย่างน้อย 10 views) → แสดงเป็น pill
                </p>
                <p className="text-[11px] mt-1 text-[#64748b]">
                  <b>เช่น:</b> 10:00 วันนี้ 28 views (ปกติ 5) → มี spike อาจเป็นผลจาก ads หรือโพสต์
                </p>
              </div>
            </div>
          </section>

          {/* Section: Marketing 101 */}
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">💼 การตลาด 101 — อ่านข้อมูลให้เป็น</h3>
            <div className="space-y-2 text-xs text-[#94a3b8]">
              <div className="bg-[#1a1a28] rounded-lg p-3">
                <div className="font-bold text-white mb-1">🎯 ยิง ads แล้วดู 3 อย่าง</div>
                <ol className="space-y-1 text-[11px] pl-4 list-decimal marker:text-amber-400">
                  <li><b>Views/Visitors ขึ้นไหม?</b> → ads ดึงคนเข้าได้</li>
                  <li><b>Bounce rate เปลี่ยนยังไง?</b> → ถ้าสูงขึ้นมาก = ads ดึงคนผิดกลุ่ม (ไม่ตรงเป้า)</li>
                  <li><b>Views/Visitors ratio</b> → ถ้าลดลง = คนเข้ามาดูหน้าเดียวแล้วไป ต้องแก้ UX</li>
                </ol>
              </div>
              <div className="bg-[#1a1a28] rounded-lg p-3">
                <div className="font-bold text-white mb-1">📅 เปรียบเทียบถูกช่วง</div>
                <p className="text-[11px]">
                  ระวัง! วันหยุดยาว-เทศกาลอาจทำให้ % แปลก — ถ้าสงกรานต์ผ่านมา ตัวเลข 7 วันนี้อาจดูตก แต่ไม่ใช่เพราะ marketing ไม่ดี
                </p>
              </div>
              <div className="bg-[#1a1a28] rounded-lg p-3">
                <div className="font-bold text-white mb-1">🎣 Benchmark ร้านวัสดุก่อสร้าง</div>
                <ul className="space-y-1 text-[11px] pl-4 list-disc marker:text-cyan-400">
                  <li>Views/Visitor เฉลี่ย: 2-4 หน้า (เว็บ B2C retail)</li>
                  <li>Bounce rate เฉลี่ย: 40-60% ถือว่าปกติ</li>
                  <li>Peak ช่วงเย็น 18:00-21:00 (หลังเลิกงาน คนค้นของใช้บ้าน)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <div className="text-[10px] text-[#475569] text-center pt-2 border-t border-white/5">
            ข้อมูลจาก Vercel Web Analytics — ไม่เก็บข้อมูลระบุตัวตน (no cookies, GDPR-safe)
          </div>
        </div>

        {/* Close button (bottom) */}
        <div className="shrink-0 px-4 md:px-5 py-3 border-t border-white/5 bg-[#0f0f18]">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-medium transition-colors cursor-pointer"
          >
            เข้าใจแล้ว
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
            className="shrink-0 w-9 h-9 rounded-lg bg-[#1e1e2e] border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            title="คู่มืออ่านค่า Analytics"
            aria-label="คู่มือ"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
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
          <p className="text-sm text-[#64748b] mb-2">ยังไม่สามารถดึงข้อมูล Analytics ได้</p>
          {data?.error && <p className="text-xs text-red-400/70 mt-2 font-mono break-all">{data.error}</p>}
          <p className="text-xs text-[#475569] mt-2">ตรวจสอบว่าเปิด Web Analytics ใน Vercel Dashboard แล้ว</p>
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
