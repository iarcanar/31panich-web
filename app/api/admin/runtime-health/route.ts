import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getRecentErrors, clearRecentErrors } from "@/lib/error-log"

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const errors = await getRecentErrors()
    return NextResponse.json({ errors })
  } catch {
    return NextResponse.json({ errors: [] })
  }
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    await clearRecentErrors()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
