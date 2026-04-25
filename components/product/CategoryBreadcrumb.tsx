"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface Props {
  categoryLabel: string
  categoryValue: string
}

export default function CategoryBreadcrumb({ categoryLabel, categoryValue }: Props) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <nav className="flex items-stretch gap-0 text-xs md:text-sm -ml-4 -mr-4">
        <button
          onClick={handleBack}
          aria-label="ย้อนกลับ"
          type="button"
          className="crumb-chip crumb-chip-back"
        >
          <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="ml-1 hidden md:inline">ย้อนกลับ</span>
        </button>
        <Link href="/" className="crumb-chip">หน้าแรก</Link>
        <span className="crumb-chip crumb-chip-active crumb-chip-dissolve-right flex-1 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <img
              src={`/category-icons/${categoryValue}.svg`}
              alt=""
              className="h-[1.1em] w-[1.1em] shrink-0"
            />
            <span className="th-text leading-[1.2] line-clamp-2">{categoryLabel}</span>
          </span>
        </span>
      </nav>
    </div>
  )
}
