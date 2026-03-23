import { NextRequest, NextResponse } from "next/server"
import { getAiConfig, saveAiConfig } from "@/lib/ai-config"

export async function GET() {
  try {
    return NextResponse.json(await getAiConfig())
  } catch (err) {
    console.error("[api/ai-config/GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const instructions = String(body.instructions || "").trim()
    if (!instructions) {
      return NextResponse.json({ error: "คำแนะนำห้ามว่าง" }, { status: 400 })
    }
    await saveAiConfig({ instructions })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/ai-config/PUT]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
