import { NextResponse } from "next/server"
import { getActiveCampaign } from "@/lib/campaigns"

// โครงการ active ปัจจุบัน — ใช้โดย ChatWidget เพื่อโชว์ chip เริ่มต้น
// อ่านจาก Redis (blob-store cache ~30s) → admin toggle มีผลภายใน ~30 วินาที
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const c = await getActiveCampaign()
    if (!c) return NextResponse.json({ active: false })
    return NextResponse.json({ active: true, chipLabel: c.chipLabel, name: c.name })
  } catch {
    return NextResponse.json({ active: false })
  }
}
