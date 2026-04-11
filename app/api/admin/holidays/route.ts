import { NextRequest, NextResponse } from "next/server"
import { getHolidays, saveHolidays, type Holiday } from "@/lib/holidays"

export async function GET() {
  try {
    return NextResponse.json(await getHolidays())
  } catch (err) {
    console.error("[api/admin/holidays/GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const holidays = body as Holiday[]

    if (!Array.isArray(holidays)) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
    }

    for (const h of holidays) {
      if (!h.id || !h.name || !h.closedFrom || !h.closedTo || !h.reopenDate) {
        return NextResponse.json({ error: "ข้อมูลวันหยุดไม่ครบ" }, { status: 400 })
      }
      if (h.closedFrom > h.closedTo) {
        return NextResponse.json({ error: "วันเริ่มต้นต้องก่อนวันสิ้นสุด" }, { status: 400 })
      }
      if (h.reopenDate <= h.closedTo) {
        return NextResponse.json({ error: "วันเปิดทำการต้องหลังวันหยุดสุดท้าย" }, { status: 400 })
      }
    }

    await saveHolidays(holidays)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/admin/holidays/PUT]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
