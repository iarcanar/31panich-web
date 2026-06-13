import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

const PROJECT_ID = "prj_f61eaKwaLKLcb7YcTkNh19Z6Tqfk"
const TEAM_ID = "teeiarcanar-9511s-projects"
// Where the data actually lives. Vercel has NO public REST API for Web Analytics
// timeseries — the dashboard reads it from the cookie-authenticated front-API
// (vercel.com/api/web-analytics/*), which ignores personal access tokens and
// answers 404. We deep-link admins there instead of showing a raw error.
const DASHBOARD_URL = "https://vercel.com/teeiarcanar-9511s-projects/31panich-web/analytics"

interface TimeseriesItem {
  key: string
  total: number
  devices: number
  bounceRate: number
}

// In-memory cache: reduce redundant Vercel API calls on repeated refresh.
// Admin UI refreshes frequently — 60s cache is invisible to user but saves quota.
const CACHE = new Map<string, { ts: number; data: unknown }>()
const CACHE_TTL = 60_000

function periodToMs(period: string): number {
  const ranges: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  }
  return ranges[period] || ranges["24h"]
}

async function fetchTimeseries(token: string, from: string, to: string): Promise<TimeseriesItem[]> {
  const headers: HeadersInit = { Authorization: `Bearer ${token}` }
  const base = `https://vercel.com/api/web-analytics`
  const qs = `projectId=${PROJECT_ID}&teamId=${TEAM_ID}&from=${from}&to=${to}&environment=production`
  const res = await fetch(`${base}/timeseries?${qs}`, { headers, cache: "no-store" })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text.slice(0, 200)}`)
  }
  const raw = await res.json()
  return raw?.data?.groups?.all || []
}

function summarize(items: TimeseriesItem[]) {
  const totalViews = items.reduce((s, d) => s + d.total, 0)
  const totalVisitors = items.reduce((s, d) => s + (d.devices || 0), 0)
  const nonZero = items.filter((d) => d.total > 0)
  const avgBounce = nonZero.length > 0
    ? Math.round(nonZero.reduce((s, d) => s + (d.bounceRate || 0), 0) / nonZero.length)
    : 0
  let peak: TimeseriesItem | null = null
  for (const d of items) if (!peak || d.total > peak.total) peak = d
  return {
    totalViews,
    totalVisitors,
    avgBounceRate: avgBounce,
    peakTime: peak?.key || null,
    peakViews: peak?.total || 0,
    dataPoints: items.length,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Prefer a dedicated analytics token if supplied. Vercel's Web Analytics
    // front-API needs a browser *session* bearer (not a PAT); paste one into
    // VERCEL_ANALYTICS_TOKEN to pull live data here. Falls back to VERCEL_TOKEN.
    const token = process.env.VERCEL_ANALYTICS_TOKEN || process.env.VERCEL_TOKEN
    if (!token) {
      return NextResponse.json({ configured: false, error: "VERCEL_TOKEN not set" })
    }

    const { searchParams } = req.nextUrl
    const period = searchParams.get("period") || "24h"

    // Serve from cache if fresh
    const cached = CACHE.get(period)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const now = Date.now()
    const ms = periodToMs(period)
    const curFrom = new Date(now - ms).toISOString()
    const curTo = new Date(now).toISOString()
    const prevFrom = new Date(now - 2 * ms).toISOString()
    const prevTo = new Date(now - ms).toISOString()

    // Fetch current + previous period in parallel
    const [curItems, prevItems] = await Promise.all([
      fetchTimeseries(token, curFrom, curTo),
      fetchTimeseries(token, prevFrom, prevTo).catch(() => [] as TimeseriesItem[]),
    ])

    const curSummary = summarize(curItems)
    const prevSummary = summarize(prevItems)

    const payload = {
      configured: true,
      period,
      summary: {
        ...curSummary,
        prev: {
          totalViews: prevSummary.totalViews,
          totalVisitors: prevSummary.totalVisitors,
          avgBounceRate: prevSummary.avgBounceRate,
        },
      },
      timeseries: curItems.map((d) => ({
        key: d.key,
        views: d.total,
        visitors: d.devices || 0,
        bounceRate: d.bounceRate || 0,
      })),
    }

    CACHE.set(period, { ts: Date.now(), data: payload })
    return NextResponse.json(payload)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal error"
    // 404 = Vercel's front-API rejected token auth (no public Web Analytics API).
    // Surface an actionable state with a deep-link rather than a cryptic "404:".
    if (msg.startsWith("404")) {
      return NextResponse.json({
        configured: true,
        dashboardOnly: true,
        dashboardUrl: DASHBOARD_URL,
        error: "Vercel ไม่เปิด API ให้ดึงข้อมูล Web Analytics ด้วย token — เปิดดูได้ใน Dashboard",
      }, { status: 200 })
    }
    return NextResponse.json({ configured: true, error: msg }, { status: 200 })
  }
}
