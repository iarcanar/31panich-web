import { NextResponse } from "next/server"
import { getActiveHoliday } from "@/lib/holidays"

export const revalidate = 300 // ISR: revalidate every 5 minutes

export async function GET() {
  try {
    const holiday = await getActiveHoliday()
    return NextResponse.json({ holiday })
  } catch (err) {
    console.error("[api/holidays/active]", err)
    return NextResponse.json({ holiday: null }, { status: 200 })
  }
}
