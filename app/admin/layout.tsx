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
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/coupons", label: "คูปอง" },
  { href: "/admin/ai-logs", label: "AI Logs" },
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
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    })
    router.push("/admin/login")
    router.refresh()
  }

  const badge = user ? ROLE_BADGE[user.role] : null
  const isAdmin = user?.role === "admin"

  return (
    <AuthContext value={{ user, isAdmin }}>
      <div className="min-h-screen bg-[#0e0e14]">
        {/* Admin nav bar */}
        <nav className="sticky top-0 z-50 bg-[#13131d] border-b border-white/10 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-1 h-11">
            <span className="text-[11px] text-[#64748b] font-medium mr-3 uppercase tracking-wider">Admin</span>
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* Spacer + Version + User info + Logout */}
            <div className="flex-1" />
            <span className="text-[10px] text-[#475569] font-mono mr-3">
              b {process.env.NEXT_PUBLIC_ADMIN_VERSION}
            </span>
            {user && badge && (
              <div className="flex items-center gap-2 mr-2">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[11px] text-[#94a3b8]">{user.id}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              {loggingOut ? "..." : "ออกจากระบบ"}
            </button>
          </div>
        </nav>
        {children}
      </div>
    </AuthContext>
  )
}
