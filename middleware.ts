import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "admin_session"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /api/admin/auth — ต้องเข้าได้เสมอ (ใช้ login)
  if (pathname.startsWith("/api/admin/auth")) return NextResponse.next()

  // /admin/login — ต้องเข้าได้เสมอ
  if (pathname === "/admin/login") return NextResponse.next()

  // ตรวจ session cookie สำหรับ /admin/* และ /api/admin/*
  const token = req.cookies.get(COOKIE_NAME)
  if (!token?.value) {
    // API routes → return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    // Pages → redirect to login
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  // Parse role จาก token เพื่อ block manager จาก destructive actions
  try {
    const [payloadB64] = token.value.split(".")
    if (payloadB64) {
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"))
      const role = payload.role

      // Manager ห้ามเข้า ai-config API
      if (role === "manager" && pathname.startsWith("/api/admin/ai-config")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 })
      }
    }
  } catch {
    // ถ้า parse ไม่ได้ ให้ผ่านไปก่อน (server-side จะตรวจอีกชั้น)
  }

  // ส่ง role ผ่าน header ให้ API routes ใช้ได้
  const response = NextResponse.next()
  return response
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
