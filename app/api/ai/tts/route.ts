import { NextRequest, NextResponse } from "next/server"
import { generateSpeech, pcmToWav, cleanForTTS } from "@/lib/tts"

// Guardrail against abuse / runaway cost — most chat replies fit well under this.
const MAX_LENGTH = 800

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI31_TTS) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
    }

    const body = await req.json().catch(() => ({}))
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
