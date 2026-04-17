"use client"

import Link from "next/link"
import { useAuth } from "./layout"

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()

  const LINKS: { href: string; label: string; desc: string; icon: React.ReactNode; color: string; adminOnly?: boolean }[] = [
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
      href: "/admin/analytics",
      label: "Analytics",
      desc: "ดูสถิติการเข้าชมเว็บไซต์แบบ Realtime",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      color: "border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5",
    },
    {
      href: "/admin/ai-logs",
      label: "AI Back-end",
      desc: "จัดการ AI, วันหยุด, ดูประวัติสนทนา",
      adminOnly: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      color: "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5",
    },
    {
      href: "/admin/settings",
      label: "ตั้งค่าระบบ",
      desc: "Hosting, Vercel, GitHub, Tech Stack",
      adminOnly: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "border-gray-500/30 hover:border-gray-500/60 hover:bg-gray-500/5",
    },
  ]

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-4 py-5 md:py-12">
      <div className="text-center mb-5 md:mb-10">
        <h1 className="text-lg md:text-2xl font-bold text-white mb-1">
          สวัสดี, {user?.name || "Admin"}
        </h1>
        <p className="text-xs md:text-sm text-[#64748b]">เลือกหน้าที่ต้องการจัดการ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
        {LINKS.filter((link) => !link.adminOnly || isAdmin).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 p-3 rounded-xl border bg-[#13131d] transition-all sm:flex-col sm:items-start sm:gap-3 sm:p-6 ${link.color}`}
          >
            <div className="text-[#94a3b8] shrink-0 sm:mb-0">{link.icon}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-base font-semibold text-white leading-tight sm:mb-1">{link.label}</h2>
              <p className="text-[11px] md:text-xs text-[#64748b] line-clamp-1 sm:line-clamp-none mt-0.5">{link.desc}</p>
            </div>
            <svg className="w-4 h-4 text-[#475569] shrink-0 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
