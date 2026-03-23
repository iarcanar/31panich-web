"use client"

import { createContext, useContext, useState, useEffect } from "react"
import Link from "next/link"

interface AdminModeState {
  isAdmin: boolean
  showDevTools: boolean
  toggleDevTools: () => void
}

const AdminModeContext = createContext<AdminModeState>({
  isAdmin: false,
  showDevTools: false,
  toggleDevTools: () => {},
})

export function useAdminMode() {
  return useContext(AdminModeContext).showDevTools
}

export function useAdminState() {
  return useContext(AdminModeContext)
}

export default function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDevTools, setShowDevTools] = useState(true)

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.user) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  function toggleDevTools() {
    setShowDevTools((v) => !v)
  }

  return (
    <AdminModeContext.Provider value={{ isAdmin, showDevTools: isAdmin && showDevTools, toggleDevTools }}>
      {isAdmin && <AdminBar showDevTools={showDevTools} onToggle={toggleDevTools} />}
      {children}
    </AdminModeContext.Provider>
  )
}

function AdminBar({ showDevTools, onToggle }: { showDevTools: boolean; onToggle: () => void }) {
  return (
    <div className="bg-purple-950/90 border-b border-purple-400/20 px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm z-[60] relative">
      <div className="flex items-center gap-2 text-purple-300">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        <span>Admin Mode</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${
            showDevTools
              ? "border-purple-400/40 text-purple-300 hover:bg-purple-400/10"
              : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
          }`}
        >
          {showDevTools ? "ดูแบบลูกค้า" : "โหมด Admin"}
        </button>
        <Link
          href="/admin"
          className="px-2.5 py-0.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-[11px] font-medium transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
