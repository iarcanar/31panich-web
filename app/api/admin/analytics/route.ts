import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

const PROJECT_ID = "prj_f61eaKwaLKLcb7YcTkNh19Z6Tqfk"
const TEAM_ID = "teeiarcanar-9511s-projects"

interface TimeseriesItem {
  key: string
  total: number
  devices: number
  bounceRate: number
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const token = process.env.VERCEL_TOKEN
    if (!token) {
      return NextResponse.json({ configured: false, error: "VERCEL_TOKEN not set" })
    }

    const headers: HeadersInit = { Authorization: `Bearer ${token}` }
    const { searchParams } = req.nextUrl
    const period = searchParams.get("period") || "24h"

    // Calculate time range
    const now = Date.now()
    const ranges: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    }
    const from = new Date(now - (ranges[period] || ranges["24h"])).toISOString()
    const to = new Date(now).toISOString()

    const base = `https://vercel.com/api/web-analytics`
    const qs = `projectId=${PROJECT_ID}&teamId=${TEAM_ID}&from=${from}&to=${to}&environment=production`

    // Fetch timeseries (the only available endpoint)
    const res = await fetch(`${base}/timeseries?${qs}`, { headers, cache: "no-store" })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({
        configured: true,
        period,
        error: `${res.status}: ${text.slice(0, 200)}`,
      })
    }

    const raw = await res.json()
    const items: TimeseriesItem[] = raw?.data?.groups?.all || []

    // Compute summary
    const totalViews = items.reduce((s, d) => s + d.total, 0)
    const totalVisitors = items.reduce((s, d) => s + (d.devices || 0), 0)
    const nonZero = items.filter((d) => d.total > 0)
    const avgBounce = nonZero.length > 0
      ? Math.round(nonZero.reduce((s, d) => s + (d.bounceRate || 0), 0) / nonZero.length)
      : 0

    // Find peak hour/day
    let peak: TimeseriesItem | null = null
    for (const d of items) {
      if (!peak || d.total > peak.total) peak = d
    }

    return NextResponse.json({
      configured: true,
      period,
      summary: {
        totalViews,
        totalVisitors,
        avgBounceRate: avgBounce,
        peakTime: peak?.key || null,
        peakViews: peak?.total || 0,
        dataPoints: items.length,
      },
      timeseries: items.map((d) => ({
        key: d.key,
        views: d.total,
        visitors: d.devices || 0,
        bounceRate: d.bounceRate || 0,
      })),
    })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
