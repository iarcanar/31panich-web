import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { Redis } from "@upstash/redis"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      return NextResponse.json({ configured: false, error: "Upstash env vars not set" })
    }

    const redis = new Redis({ url, token })

    // Get memory info via raw REST call (INFO not in @upstash/redis client)
    let memoryUsed = 0
    let maxMemory = 256 * 1024 * 1024 // 256 MB default for free tier
    try {
      const res = await fetch(`${url}/INFO/memory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const info = typeof data.result === "string" ? data.result : ""
        const usedMatch = info.match(/used_memory:(\d+)/)
        const maxMatch = info.match(/maxmemory:(\d+)/)
        if (usedMatch) memoryUsed = parseInt(usedMatch[1])
        if (maxMatch && parseInt(maxMatch[1]) > 0) maxMemory = parseInt(maxMatch[1])
      }
    } catch {}

    // Get key count
    let keyCount = 0
    try {
      keyCount = await redis.dbsize()
    } catch {}

    // Get daily command count from Upstash rate-limit headers
    let dailyCommands = { used: 0, limit: 10000 }
    try {
      const res = await fetch(`${url}/DBSIZE`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const limitHeader = res.headers.get("x-ratelimit-limit")
      const remainingHeader = res.headers.get("x-ratelimit-remaining")
      if (limitHeader && remainingHeader) {
        const limit = parseInt(limitHeader)
        const remaining = parseInt(remainingHeader)
        dailyCommands = { used: limit - remaining, limit }
      }
    } catch {}

    return NextResponse.json({
      configured: true,
      memory: {
        used: memoryUsed,
        limit: maxMemory,
        usedMB: Math.round(memoryUsed / (1024 * 1024) * 100) / 100,
        limitMB: Math.round(maxMemory / (1024 * 1024)),
      },
      keys: keyCount,
      dailyCommands,
    })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
