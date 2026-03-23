"use client"

import { createContext, useContext, useState, useEffect } from "react"

const AdminModeContext = createContext(false)

export function useAdminMode() {
  return useContext(AdminModeContext)
}

export default function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.user) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  return (
    <AdminModeContext.Provider value={isAdmin}>
      {children}
    </AdminModeContext.Provider>
  )
}
