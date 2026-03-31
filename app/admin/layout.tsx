"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, createContext, useContext } from "react"
import type { AdminUser } from "@/lib/auth"

// ─── Context เพื่อส่ง user ให้ child pages ─────────────
interface AuthContextType {
  user: AdminUser | null
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, isAdmin: false })

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Nav ───────────────────────────────────────────────
const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/coupons", label: "คูปอง" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/ai-logs", label: "AI Logs", adminOnly: true },
  { href: "/admin/settings", label: "ตั้งค่า", adminOnly: true },
]

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  manager: { label: "Manager", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [user, setUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    if (pathname === "/admin/login") return
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data) => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [pathname])

  // ไม่แสดง nav bar ในหน้า login
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  async function handleLogout() {
    setLoggingOut(true)
    setUser(null)
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    })
    window.location.href = "/admin/login"
  }

  const badge = user ? ROLE_BADGE[user.role] : null
  const isAdmin = user?.role === "admin"

  return (
    <AuthContext value={{ user, isAdmin }}>
      <div className="min-h-screen bg-[#0e0e14]">
        {/* Admin nav bar — mobile-friendly 2-row layout */}
        <nav className="sticky top-0 z-50 bg-[#13131d] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-3">
            {/* Row 1: nav tabs + user */}
            <div className="flex items-center justify-between h-10">
              <div className="flex items-center gap-0.5">
                {NAV.map((item) => {
                  const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)
                  const restricted = "adminOnly" in item && item.adminOnly && !isAdmin
                  return (
                    <Link
                      key={item.href}
                      href={restricted ? "#" : item.href}
                      onClick={restricted ? (e) => e.preventDefault() : undefined}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        restricted
                          ? "text-[#475569] cursor-not-allowed"
                          : active
                            ? "bg-white/10 text-white"
                            : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                      }`}
                      title={restricted ? "เฉพาะ Admin เท่านั้น" : undefined}
                    >
                      {item.label}
                    </Link>
                  )
                })}
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 rounded-md text-[11px] font-medium text-[#64748b] hover:text-white hover:bg-white/5 transition-colors"
                  title="เปิดหน้าเว็บ (แท็บใหม่)"
                >
                  เว็บ ↗
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-[10px] text-[#475569] font-mono">
                  b {process.env.NEXT_PUBLIC_ADMIN_VERSION}
                </span>
                {user && badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                {user && (
                  <span className="hidden sm:inline text-[10px] text-[#94a3b8]">{user.id}</span>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loggingOut ? "..." : "ออก"}
                </button>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </div>
    </AuthContext>
  )
}
