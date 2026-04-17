"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, createContext, useContext } from "react"
import type { AdminUser } from "@/lib/auth"
import type { QuotaStatus } from "@/lib/quota-check"

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
  { href: "/admin/ai-logs", label: "AI Back-end", adminOnly: true },
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
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null)

  useEffect(() => {
    if (pathname === "/admin/login") return
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data) => { if (data.user) setUser(data.user) })
      .catch(() => {})
  }, [pathname])

  // Notification dot for "ตั้งค่า" link.
  // Reads cached status from localStorage (written by /admin/settings page).
  // If cache stale (>30 min) and user is admin, fetch fresh once.
  useEffect(() => {
    if (pathname === "/admin/login") return
    if (!user || user.role !== "admin") return

    // Try cache first — settings page writes here every visit
    try {
      const cached = localStorage.getItem("quota:check")
      if (cached) {
        const { status, ts } = JSON.parse(cached) as { status: QuotaStatus; ts: number }
        if (Date.now() - ts < 30 * 60 * 1000) {
          setQuotaStatus(status)
          return
        }
      }
    } catch {
      // localStorage may be disabled
    }

    // Cache stale — fetch fresh in background. Lazy-load checkQuota to keep
    // the layout bundle small.
    let cancelled = false
    Promise.all([
      fetch("/api/admin/vercel-status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/admin/upstash-status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(async ([vercelData, upstashData]) => {
        if (cancelled) return
        const { checkQuota } = await import("@/lib/quota-check")
        const result = checkQuota(vercelData, upstashData)
        setQuotaStatus(result.status)
        try {
          localStorage.setItem("quota:check", JSON.stringify({ status: result.status, ts: Date.now() }))
        } catch {
          // ignore
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [pathname, user])

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
        {/* Admin nav — mobile: 2 rows (scrollable tabs + utility); desktop: 1 row */}
        <nav className="sticky top-0 z-50 bg-[#13131d] border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            {/* Mobile: 2 rows (3×2 menu grid + utility row). Desktop: 1 row flex. */}
            {/* Row 1: menu tabs — grid-cols-3 on mobile (exactly 6 items = 2 rows), flex on desktop */}
            <div className="md:flex md:items-center md:justify-between md:px-3 md:h-10">
              <div className="grid grid-cols-3 gap-1 p-1.5 md:flex md:items-center md:gap-1 md:p-0">
                {NAV.map((item) => {
                  const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)
                  const restricted = "adminOnly" in item && item.adminOnly && !isAdmin
                  const showQuotaDot =
                    item.href === "/admin/settings" &&
                    !restricted &&
                    quotaStatus !== null &&
                    quotaStatus !== "ok"
                  return (
                    <Link
                      key={item.href}
                      href={restricted ? "#" : item.href}
                      onClick={restricted ? (e) => e.preventDefault() : undefined}
                      className={`relative flex items-center justify-center text-center whitespace-nowrap px-2 py-2 md:px-3 md:py-1.5 rounded-lg text-[11px] md:text-xs font-medium transition-colors ${
                        restricted
                          ? "text-[#475569] cursor-not-allowed bg-[#0f0f18] md:bg-transparent"
                          : active
                            ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                            : "text-[#94a3b8] hover:text-white hover:bg-white/5 bg-[#0f0f18] md:bg-transparent"
                      }`}
                      title={
                        restricted
                          ? "เฉพาะ Admin เท่านั้น"
                          : showQuotaDot
                            ? `โควต้า ${quotaStatus === "critical" ? "เกินวงเงิน" : "ใกล้เกิน"} — คลิกเพื่อดูคำแนะนำ`
                            : undefined
                      }
                    >
                      {item.label}
                      {showQuotaDot && (
                        <span
                          className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                            quotaStatus === "critical" ? "bg-red-500" : "bg-amber-500"
                          } animate-pulse`}
                          aria-label={quotaStatus === "critical" ? "critical quota" : "warning quota"}
                        />
                      )}
                    </Link>
                  )
                })}
                {/* Desktop only: "หน้าเว็บ" stays in nav row next to tabs */}
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#64748b] hover:text-white hover:bg-white/5 transition-colors"
                  title="เปิดหน้าเว็บ (แท็บใหม่)"
                >
                  หน้าเว็บ ↗
                </a>
              </div>
              {/* Desktop-only utility group */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] text-[#475569] font-mono">
                  b {process.env.NEXT_PUBLIC_ADMIN_VERSION}
                </span>
                {user && badge && (
                  <span className={`whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                {user && (
                  <span className="text-[10px] text-[#94a3b8]">{user.id}</span>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="shrink-0 px-2 py-1 rounded-md text-[11px] font-medium text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loggingOut ? "..." : "ออกจากระบบ"}
                </button>
              </div>
            </div>
            {/* Row 2 (mobile only): หน้าเว็บ link · user identity · logout */}
            <div className="flex md:hidden items-center justify-between gap-2 h-10 px-2 border-t border-white/5 bg-[#0a0a12]">
              {/* Left: หน้าเว็บ link */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 h-8 px-2.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5 transition-colors text-[11px] font-medium whitespace-nowrap"
                title="เปิดหน้าเว็บ (แท็บใหม่)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                </svg>
                หน้าเว็บ ↗
              </a>
              {/* Middle: user identity — single row: [role badge] login-id */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                {user && badge && (
                  <span className={`shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                {user && (
                  <span className="text-[11px] text-[#94a3b8] truncate" title={`เข้าระบบในชื่อ ${user.id}`}>
                    {user.id}
                  </span>
                )}
                <span className="hidden xs:inline text-[10px] text-[#475569] font-mono ml-1">
                  b{process.env.NEXT_PUBLIC_ADMIN_VERSION}
                </span>
              </div>
              {/* Right: logout */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="shrink-0 h-8 px-2.5 rounded-md text-[11px] font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer whitespace-nowrap border border-red-500/20 flex items-center gap-1"
                title="ออกจากระบบ"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {loggingOut ? "..." : "ออก"}
              </button>
            </div>
          </div>
        </nav>
        {children}
      </div>
    </AuthContext>
  )
}
