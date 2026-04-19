import { NextRequest, NextResponse } from "next/server"
import { generateSpeech, pcmToWav, cleanForTTS } from "@/lib/tts"
import { getSession } from "@/lib/ai-session"

// ─── Guards ─────────────────────────────────────────────
// Cap per-request text — most chat replies are well under this.
const MAX_LENGTH = 800

// Simple in-memory per-IP rate limiter. Scoped to a single serverless
// instance, which is enough to blunt basic abuse bursts. Tune MAX if
// legitimate traffic ever bumps into the ceiling.
const RL_MAX = 15                         // 15 TTS calls per minute per IP
const RL_WINDOW_MS = 60_000
const rateMap = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  // Lazy cleanup when map grows — serverless warm instances otherwise hold
  // stale entries until the instance recycles.
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) if (v.resetAt < now) rateMap.delete(k)
  }
  const entry = rateMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS })
    return true
  }
  if (entry.count >= RL_MAX) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI31_TTS) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
    }

    // 1) Per-IP rate limit
    const ip = clientIp(req)
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "rate limit" },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    const body = await req.json().catch(() => ({}))

    // 2) Session binding — TTS must come from an active chat session.
    //    Stops random external callers from burning quota on this endpoint.
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    if (!sessionId || !getSession(sessionId)) {
      return NextResponse.json({ error: "invalid session" }, { status: 401 })
    }

    // 3) Text validation
    const rawText = typeof body.text === "string" ? body.text : ""
    if (!rawText.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 })
    }

    const cleaned = cleanForTTS(rawText)
    if (!cleaned) {
      return NextResponse.json({ error: "empty after cleaning" }, { status: 400 })
    }
    if (cleaned.length > MAX_LENGTH) {
      return NextResponse.json({ error: `text too long (max ${MAX_LENGTH})` }, { status: 400 })
    }

    const { pcm, sampleRate } = await generateSpeech(cleaned)
    const wav = pcmToWav(pcm, sampleRate)

    return new Response(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[api/ai/tts]", err)
    return NextResponse.json({ error: "TTS generation failed" }, { status: 500 })
  }
}
