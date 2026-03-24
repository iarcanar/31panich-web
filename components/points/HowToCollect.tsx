"use client"

import Image from "next/image"
import { useRef, useEffect } from "react"
import { LINE_POINTS_URL } from "@/lib/store-config"

/* ─── Floating purple particle shapes ─── */
const SHAPES = [
  "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z", // 4-point star
  "M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6Z",                      // Circle
  "M12 4L16 12L12 20L8 12Z",                                        // Diamond
  "M12 3L15 10L22 10L16.5 14.5L18.5 21.5L12 17L5.5 21.5L7.5 14.5L2 10L9 10Z", // Star
]

function spawnParticle(container: HTMLDivElement) {
  const ns = "http://www.w3.org/2000/svg"
  const size = 5 + Math.random() * 18
  const left = 2 + Math.random() * 96
  const top = 2 + Math.random() * 96
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const brightness = 0.15 + Math.random() * 0.3
  const rotation = Math.random() * 360
  const duration = 3000 + Math.random() * 3000
  const driftX = (Math.random() - 0.5) * 30
  const driftY = -10 - Math.random() * 20

  const el = document.createElement("div")
  el.style.cssText = `position:absolute;left:${left}%;top:${top}%;width:${size}px;height:${size}px;pointer-events:none;`

  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", `rgba(168,85,247,${brightness})`)
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.style.cssText = "width:100%;height:100%"

  const path = document.createElementNS(ns, "path")
  path.setAttribute("d", shape)
  svg.appendChild(path)
  el.appendChild(svg)
  container.appendChild(el)

  const anim = el.animate(
    [
      { transform: `translate(0,0) rotate(0deg) scale(0)`, opacity: 0 },
      { transform: `translate(${driftX * 0.3}px,${driftY * 0.3}px) rotate(${rotation * 0.2}deg) scale(1)`, opacity: 0.8, offset: 0.15 },
      { transform: `translate(${driftX * 0.7}px,${driftY * 0.7}px) rotate(${rotation * 0.6}deg) scale(0.8)`, opacity: 0.4, offset: 0.6 },
      { transform: `translate(${driftX}px,${driftY}px) rotate(${rotation}deg) scale(0)`, opacity: 0 },
    ],
    { duration, easing: "ease-in-out", fill: "forwards" },
  )
  anim.onfinish = () => el.remove()
}

export default function HowToCollect() {
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let active = true

    function schedule() {
      if (!active || !container) return
      const delay = 400 + Math.random() * 600
      timerRef.current = setTimeout(() => {
        if (!active) return
        spawnParticle(container)
        schedule()
      }, delay)
    }

    schedule()

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const items = [
    { image: "/points/deco-31stone.webp", title: "ช้อปครบ 500 บาท", sub: "รับทันที 1 แต้ม" },
    { image: "/points/deco-treasure.webp", title: "สะสมได้ไม่อั้น", sub: "ยิ่งช้อปยิ่งได้แต้มเยอะ" },
    { icon: true, title: "เช็คแต้มคงเหลือ", sub: "กดเพื่อตรวจสอบแต้มของคุณ", link: LINE_POINTS_URL },
  ]

  return (
    <div className="max-w-3xl mx-auto bg-[#1a1a28]/90 backdrop-blur rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      {/* ── Glow border (always on, like scroll_plate at full intensity) ── */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          border: "1px solid rgba(147,51,234,0.5)",
          borderRadius: "inherit",
          boxShadow: "inset 0 0 30px rgba(147,51,234,0.08), 0 0 20px rgba(147,51,234,0.15)",
        }}
      />
      {/* Radial glow — top center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "inherit",
          background: "radial-gradient(ellipse 70% 45% at 50% 10%, rgba(147,51,234,0.22), transparent)",
        }}
      />

      {/* Floating particles layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: "inherit" }}
      />

      {/* Soft glow accents at corners */}
      <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">สะสมแต้มง่ายๆ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const content = (
              <>
                {item.icon ? (
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/30 border border-violet-400/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-violet-500/50">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden transition-transform duration-300 group-hover:scale-110">
                    <Image src={item.image!} alt="" width={80} height={80} className="w-full h-full object-contain" />
                  </div>
                )}
                <p className="text-white font-semibold">{item.title}</p>
                <p className="text-gray-400 text-sm mt-1">{item.sub}</p>
              </>
            )
            return item.link ? (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="text-center group cursor-pointer">
                {content}
              </a>
            ) : (
              <div key={i} className="text-center group cursor-default">
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
