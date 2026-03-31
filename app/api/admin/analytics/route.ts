import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

const PROJECT_ID = "prj_f61eaKwaLKLcb7YcTkNh19Z6Tqfk"
const TEAM_ID = "teeiarcanar-9511s-projects"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const token = process.env.VERCEL_TOKEN
    if (!token) {
      return NextResponse.json({ configured: false, error: "VERCEL_TOKEN not set" })
    }

    const headers: HeadersInit = { Authorization: `Bearer ${token}` }
    const { searchParams } = req.nextUrl
    const period = searchParams.get("period") || "24h" // 24h, 7d, 30d

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

    const result: Record<string, unknown> = { configured: true, period }

    // 1. Page views timeseries
    try {
      const res = await fetch(`${base}/timeseries?${qs}`, { headers, cache: "no-store" })
      if (res.ok) {
        result.timeseries = await res.json()
      } else {
        const text = await res.text()
        result.timeseriesError = `${res.status}: ${text.slice(0, 200)}`
      }
    } catch (e) {
      result.timeseriesError = e instanceof Error ? e.message : "fetch failed"
    }

    // 2. Top pages
    try {
      const res = await fetch(`${base}/top-pages?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.topPages = await res.json()
      }
    } catch {}

    // 3. Top referrers
    try {
      const res = await fetch(`${base}/top-referrers?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.topReferrers = await res.json()
      }
    } catch {}

    // 4. Countries
    try {
      const res = await fetch(`${base}/top-countries?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.countries = await res.json()
      }
    } catch {}

    // 5. Devices
    try {
      const res = await fetch(`${base}/top-devices?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.devices = await res.json()
      }
    } catch {}

    // 6. Browsers
    try {
      const res = await fetch(`${base}/top-browsers?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.browsers = await res.json()
      }
    } catch {}

    // 7. OS
    try {
      const res = await fetch(`${base}/top-operating-systems?${qs}&limit=10`, { headers, cache: "no-store" })
      if (res.ok) {
        result.os = await res.json()
      }
    } catch {}

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
