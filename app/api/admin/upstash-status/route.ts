import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

/** Resolve Upstash env vars (Vercel KV integration uses different names) */
function getUpstashEnv() {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function redisCommand(url: string, token: string, ...args: string[]) {
  const res = await fetch(`${url}/${args.join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { data: res.ok ? await res.json() : null, headers: res.headers }
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const env = getUpstashEnv()
    if (!env) {
      return NextResponse.json({ configured: false, error: "Upstash env vars not set" })
    }

    // 1) INFO memory → used_memory, maxmemory
    let memoryUsed = 0
    let maxMemory = 256 * 1024 * 1024
    try {
      const { data } = await redisCommand(env.url, env.token, "INFO", "memory")
      const info = typeof data?.result === "string" ? data.result : ""
      const usedMatch = info.match(/used_memory:(\d+)/)
      const maxMatch = info.match(/maxmemory:(\d+)/)
      if (usedMatch) memoryUsed = parseInt(usedMatch[1])
      if (maxMatch && parseInt(maxMatch[1]) > 0) maxMemory = parseInt(maxMatch[1])
    } catch {}

    // 2) DBSIZE → key count + rate-limit headers → daily commands
    let keyCount = 0
    let dailyCommands = { used: 0, limit: 10000 }
    try {
      const { data, headers } = await redisCommand(env.url, env.token, "DBSIZE")
      if (data?.result != null) keyCount = Number(data.result)

      const limit = headers.get("x-ratelimit-limit")
      const remaining = headers.get("x-ratelimit-remaining")
      if (limit && remaining) {
        dailyCommands = {
          used: parseInt(limit) - parseInt(remaining),
          limit: parseInt(limit),
        }
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
