"use client"

import Link from "next/link"
import { useAuth } from "./layout"

export default function AdminDashboard() {
  const { user } = useAuth()

  const LINKS = [
    {
      href: "/",
      label: "หน้าแรก",
      desc: "ดูเว็บไซต์ในมุมมอง Admin พร้อมปุ่มแก้ไขสินค้า",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      color: "border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5",
    },
    {
      href: "/admin/products",
      label: "จัดการสินค้า",
      desc: "เพิ่ม แก้ไข ลบสินค้า อัพโหลดรูป AI enrich",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      color: "border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5",
    },
    {
      href: "/admin/coupons",
      label: "จัดการคูปอง",
      desc: "สร้าง แก้ไข คูปองโปรโมชั่น",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
      color: "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5",
    },
    {
      href: "/admin/ai-logs",
      label: "AI Logs",
      desc: "ดูประวัติการใช้งาน AI chat",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      color: "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5",
    },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          สวัสดี, {user?.name || "Admin"}
        </h1>
        <p className="text-sm text-[#64748b]">เลือกหน้าที่ต้องการ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block p-6 rounded-xl border bg-[#13131d] transition-all ${link.color}`}
          >
            <div className="text-[#94a3b8] mb-3">{link.icon}</div>
            <h2 className="text-base font-semibold text-white mb-1">{link.label}</h2>
            <p className="text-xs text-[#64748b]">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
