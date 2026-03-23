import { NextRequest, NextResponse } from "next/server"
import { verifyCredentials, createSession, destroySession, getSessionUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Logout
    if (body.action === "logout") {
      await destroySession()
      return NextResponse.json({ ok: true })
    }

    // Login
    const { username, password } = body
    if (!username || !password) {
      return NextResponse.json({ error: "credentials required" }, { status: 400 })
    }

    const user = verifyCredentials(username, password)
    if (!user) {
      return NextResponse.json({ error: "wrong credentials" }, { status: 401 })
    }

    await createSession(user)
    return NextResponse.json({ ok: true, user })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

/** GET — ดึง session user ปัจจุบัน */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
