"use client"

import { useRouter } from "next/navigation"
import { useAdminMode } from "@/components/admin/AdminModeProvider"

export default function DevEditLink({ productId, size = "md" }: { productId: string; size?: "sm" | "md" }) {
  const isAdmin = useAdminMode()
  const router = useRouter()

  if (!isAdmin) return null

  const wh = size === "sm" ? "w-7 h-7" : "w-8 h-8"
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/admin/products?edit=${productId}`) }}
      className={`absolute bottom-3 right-3 z-20 ${wh} rounded-full bg-neutral-800/70 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-neutral-700/80 transition-all cursor-pointer`}
      title="แก้ไขสินค้า"
    >
      <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  )
}
