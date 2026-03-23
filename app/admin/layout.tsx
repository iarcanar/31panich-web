"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/coupons", label: "คูปอง" },
  { href: "/admin/ai-logs", label: "AI Logs" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
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
        </div>
      </nav>
      {children}
    </div>
  )
}
