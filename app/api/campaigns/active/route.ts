import { NextResponse } from "next/server"
import { getActiveCampaign } from "@/lib/campaigns"

// โครงการ active ปัจจุบัน — ใช้โดย ChatWidget เพื่อโชว์ chip เริ่มต้น
// cache 1 ชม. (date gating เปลี่ยนช้า — ยอมรับ staleness ได้, ลด invocations)
export const revalidate = 3600

export async function GET() {
  try {
    const c = getActiveCampaign()
    if (!c) return NextResponse.json({ active: false })
    return NextResponse.json({ active: true, chipLabel: c.chipLabel, name: c.name })
  } catch {
    return NextResponse.json({ active: false })
  }
}
