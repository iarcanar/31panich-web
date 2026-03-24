"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CATEGORIES } from "@/lib/categories"

const NAV_ITEMS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/points", label: "แต้มสามหนึ่ง" },
  {
    href: "/products",
    label: "หมวดหมู่สินค้า",
    children: CATEGORIES.map((c) => ({ href: `/products/${c.value}`, label: c.label })),
  },
  { href: "/promotions", label: "โปรโมชั่น" },
  { href: "/warranty", label: "การรับประกัน" },
  { href: "/catalog", label: "แคตตาล็อก" },
  { href: "/about", label: "เกี่ยวกับสามหนึ่ง" },
  { href: "/contact", label: "ติดต่อสามหนึ่ง" },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastScrollY = useRef(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    router.push(`/products?search=${encodeURIComponent(q)}`)
    setSearchQuery("")
    setSearchOpen(false)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  // Mobile: hide header on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 60) {
        setHeaderHidden(false)
      } else if (y > lastScrollY.current + 5) {
        setHeaderHidden(true)
      } else if (y < lastScrollY.current - 5) {
        setHeaderHidden(false)
      }
      lastScrollY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Mobile: clear glass (โปร่งใส เห็นคอนเทนต์ผ่าน). Desktop: solid bg + shadow.
  const headerBg = "bg-[#0a0a0f]/35 border-b border-white/10 lg:bg-[#0a0a0f] lg:border-transparent lg:shadow-lg"

  return (
    <>
    <header className={`sticky top-0 z-50 text-white transition-all duration-300 ${headerBg} ${headerHidden && !mobileOpen ? "-translate-y-full lg:translate-y-0" : "translate-y-0"}`}>
      <div className="flex items-center justify-between px-4 py-2 lg:justify-center lg:gap-3">
        {/* Logo — mobile & desktop */}
        <Link href="/" className="shrink-0">
          <Image src="/logo.webp" alt="31 พานิช" width={40} height={40} priority />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          {NAV_ITEMS.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className="px-2.5 py-2 text-sm font-medium hover:text-cyan-400 transition-colors whitespace-nowrap"
              >
                {item.label}
                {item.children && <span className="ml-1">▾</span>}
              </Link>
              {item.children && (
                <div className="absolute top-full left-0 hidden group-hover:block bg-slate-800 rounded-md shadow-xl min-w-[200px] py-2 z-50">
                  {item.children.map((child) => {
                    const slug = child.href.split("/").pop()
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700 hover:text-cyan-400"
                      >
                        <img src={`/category-icons/${slug}.svg`} alt="" className="h-[14px] w-[14px] opacity-70" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="hidden lg:flex items-center shrink-0">
          <div className={`flex items-center gap-1 rounded-full border transition-all duration-200 overflow-hidden ${
            searchOpen
              ? "border-cyan-500/50 bg-white/5 pl-3 pr-1 w-52"
              : "border-transparent bg-transparent w-8"
          }`}>
            {searchOpen && (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสินค้า..."
                className="bg-transparent text-white placeholder-gray-500 text-sm outline-none w-full py-1.5"
                onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              />
            )}
            <button
              type={searchOpen ? "submit" : "button"}
              onClick={() => !searchOpen && setSearchOpen(true)}
              className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors shrink-0"
              aria-label="ค้นหา"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </form>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="เปิดเมนู"
          aria-expanded={mobileOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-700 px-4 py-4 space-y-2 bg-slate-900/95 backdrop-blur-sm overflow-y-auto overscroll-contain" style={{ maxHeight: "calc(100vh - 56px)" }}>
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white/5 border border-slate-600 rounded-full px-3 py-2 mb-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="bg-transparent text-white placeholder-gray-500 text-sm outline-none flex-1"
            />
            {searchQuery && (
              <button type="submit" className="text-cyan-400 text-xs font-medium">ค้นหา</button>
            )}
          </form>

          {NAV_ITEMS.map((item) => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-cyan-400 transition-colors"
                    onClick={() => setExpandedMenu(expandedMenu === item.href ? null : item.href)}
                  >
                    {item.label}
                    <svg className={`w-4 h-4 transition-transform ${expandedMenu === item.href ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedMenu === item.href && (
                    <div className="pl-4 space-y-1 pb-1">
                      {item.children.map((child) => {
                        const slug = child.href.split("/").pop()
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex items-center gap-2 py-1 text-sm text-gray-400 hover:text-cyan-400"
                            onClick={() => setMobileOpen(false)}
                          >
                            <img src={`/category-icons/${slug}.svg`} alt="" className="h-[14px] w-[14px] opacity-60" />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className="block py-2 text-sm font-medium hover:text-cyan-400"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}
    </header>

    </>
  )
}
