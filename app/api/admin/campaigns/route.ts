import { NextRequest, NextResponse } from "next/server"
import { getCampaigns, saveCampaigns, type Campaign } from "@/lib/campaigns"

// จัดการโปรพิเศษ/โครงการรัฐ (auth คุมโดย middleware.ts → /api/admin/:path*)

export async function GET() {
  try {
    return NextResponse.json(await getCampaigns())
  } catch (err) {
    console.error("[api/admin/campaigns/GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const campaigns = body as Campaign[]

    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
    }

    for (const c of campaigns) {
      if (!c.id || !c.name || !c.startDate || !c.endDate) {
        return NextResponse.json({ error: "ข้อมูลโครงการไม่ครบ" }, { status: 400 })
      }
      if (c.startDate > c.endDate) {
        return NextResponse.json({ error: "วันเริ่มต้องก่อนวันสิ้นสุด" }, { status: 400 })
      }
    }

    await saveCampaigns(campaigns)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/admin/campaigns/PUT]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
