import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

// In-memory cache (per lambda instance) — saves 3 Vercel API calls per dashboard load.
// Pass ?fresh=1 to bypass and force a live fetch.
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let cached: { data: Record<string, unknown>; ts: number } | null = null

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const fresh = request.nextUrl.searchParams.get("fresh") === "1"
    if (!fresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ ...cached.data, _cached: true, _cachedAt: cached.ts })
    }

    const token = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID

    if (!token) {
      return NextResponse.json({ configured: false, error: "VERCEL_TOKEN not set" })
    }

    const headers: HeadersInit = { Authorization: `Bearer ${token}` }
    const result: Record<string, unknown> = { configured: true }

    // Fetch recent deployments
    try {
      const url = projectId
        ? `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`
        : `https://api.vercel.com/v6/deployments?limit=5`
      const res = await fetch(url, { headers, next: { revalidate: 0 } })
      if (res.ok) {
        const data = await res.json()
        result.deployments = (data.deployments || []).map((d: Record<string, unknown>) => ({
          uid: d.uid,
          url: d.url,
          state: d.state || d.readyState,
          created: d.created || d.createdAt,
          meta: d.meta,
          // Surface error info so admin can see WHY a deploy failed without
          // needing to open the Vercel dashboard.
          errorCode: d.errorCode,
          errorMessage: d.errorMessage,
          inspectorUrl: d.inspectorUrl,
        }))
      }
    } catch {}

    // Fetch usage/quota (Hobby plan resource usage)
    try {
      const period = new Date().toISOString().slice(0, 7) // YYYY-MM
      const res = await fetch(
        `https://api.vercel.com/v1/usage?period=${period}`,
        { headers, next: { revalidate: 0 } },
      )
      if (res.ok) {
        result.usage = await res.json()
      }
    } catch {}

    // Fetch user/plan info
    try {
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers,
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        result.plan = {
          name: data.user?.softBlock?.blockedAt ? "blocked" : (data.user?.billing?.plan || "hobby"),
          username: data.user?.username,
        }
      }
    } catch {}

    cached = { data: result, ts: Date.now() }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
