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
      {isAdmin && <AdminFab />}
    </AdminModeContext.Provider>
  )
}

function AdminFab() {
  return (
    <Link
      href="/admin"
      className="fixed bottom-6 left-2 z-50 w-9 h-9 rounded-full bg-purple-950/80 border border-purple-400/20
        flex items-center justify-center text-purple-300/60 hover:text-white hover:bg-purple-900
        shadow-lg shadow-purple-900/30 transition-all opacity-60 hover:opacity-100"
      title="Admin Dashboard"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </Link>
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
