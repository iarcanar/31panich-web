import { NextRequest, NextResponse } from "next/server"
import { getAiConfig, saveAiConfig } from "@/lib/ai-config"

export async function GET() {
  return NextResponse.json(getAiConfig())
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const instructions = String(body.instructions || "").trim()
  if (!instructions) {
    return NextResponse.json({ error: "คำแนะนำห้ามว่าง" }, { status: 400 })
  }
  saveAiConfig({ instructions })
  return NextResponse.json({ ok: true })
}
