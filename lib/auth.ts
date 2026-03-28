import { cookies } from "next/headers"
import crypto from "crypto"

// ─── Types ───────────────────────────────────────────────
export type UserRole = "admin" | "manager"

export interface AdminUser {
  id: string
  name: string
  role: UserRole
}

interface StoredUser {
  id: string
  password: string
  role: UserRole
  name: string
}

// ─── Constants ───────────────────────────────────────────
const COOKIE_NAME = "admin_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// ─── User store (from env) ──────────────────────────────
function getUsers(): StoredUser[] {
  const raw = process.env.ADMIN_USERS
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// ─── Auth functions ─────────────────────────────────────

/** ตรวจ username + password → คืน user info ถ้าถูก */
export function verifyCredentials(username: string, password: string): AdminUser | null {
  const users = getUsers()
  const found = users.find((u) => u.id === username && u.password === password)
  if (!found) return null
  return { id: found.id, name: found.name, role: found.role }
}

/** สร้าง session cookie ที่เก็บ user info */
export async function createSession(user: AdminUser): Promise<void> {
  const payload = JSON.stringify(user)
  const secret = process.env.ADMIN_USERS || "fallback"
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const token = Buffer.from(payload).toString("base64") + "." + signature

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

/** ลบ session cookie */
export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** อ่าน user จาก session cookie (server-side) */
export async function getSessionUser(): Promise<AdminUser | null> {
  const store = await cookies()
  const cookie = store.get(COOKIE_NAME)
  if (!cookie?.value) return null
  return parseSessionToken(cookie.value)
}

/** Parse token จาก cookie string (ใช้ใน middleware ได้) */
export function parseSessionToken(token: string): AdminUser | null {
  try {
    const [payloadB64, signature] = token.split(".")
    if (!payloadB64 || !signature) return null

    const payload = Buffer.from(payloadB64, "base64").toString("utf-8")
    const secret = process.env.ADMIN_USERS || "fallback"
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")

    if (signature !== expected) return null
    return JSON.parse(payload) as AdminUser
  } catch {
    return null
  }
}

/** ตรวจว่า role มีสิทธิ์ทำ action นี้ไหม */
export function canPerform(role: UserRole, action: "delete-product" | "delete-coupon" | "ai-config"): boolean {
  if (role === "admin") return true
  // manager ทำได้: ลบสินค้า
  if (role === "manager" && action === "delete-product") return true
  // manager ทำไม่ได้: ลบคูปอง, แก้ AI config
  return false
}
