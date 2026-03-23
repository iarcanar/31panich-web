"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error === "wrong credentials" ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" : "เกิดข้อผิดพลาด")
        return
      }

      router.push("/admin")
      router.refresh()
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0e0e14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-16 h-16 opacity-30">
            <Image src="/31-logo.svg" alt="" fill className="object-contain" />
          </div>
        </div>

        <h1 className="text-lg font-bold text-white text-center mb-1">Admin Login</h1>
        <p className="text-xs text-white/40 text-center mb-8">สามหนึ่งพานิช — ระบบจัดการ</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ชื่อผู้ใช้"
            autoFocus
            autoComplete="username"
            className="w-full px-4 py-3 bg-[#1a1a28] border border-white/10 rounded-xl text-white
              placeholder-white/30 text-center text-sm
              focus:outline-none focus:border-white/30 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-[#1a1a28] border border-white/10 rounded-xl text-white
              placeholder-white/30 text-center text-sm
              focus:outline-none focus:border-white/30 transition-colors"
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-medium
              hover:bg-white/20 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  )
}
