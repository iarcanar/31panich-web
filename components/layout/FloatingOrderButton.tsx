"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useBusinessHours } from "@/hooks/useBusinessHours"
import { PHONE_RAW, PHONE, LINE_URL, HOURS_TEXT } from "@/lib/store-config"

export default function FloatingOrderButton() {
  const { isOpen, isMobile } = useBusinessHours()
  const [showPhone, setShowPhone] = useState(false)
  const [showLine, setShowLine] = useState(false)
  const phoneRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showPhone && phoneRef.current && !phoneRef.current.contains(e.target as Node)) setShowPhone(false)
      if (showLine && lineRef.current && !lineRef.current.contains(e.target as Node)) setShowLine(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPhone, showLine])

  function handlePhoneClick() {
    if (isMobile) {
      window.location.href = `tel:${PHONE_RAW}`
    } else {
      setShowLine(false)
      setShowPhone((v) => !v)
    }
  }

  function handleLineClick() {
    if (isMobile) {
      window.location.href = LINE_URL
    } else {
      setShowPhone(false)
      setShowLine((v) => !v)
    }
  }

  // Outside hours: show only LINE button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showLine && !isMobile && (
          <div ref={lineRef} className="bg-[#14141f] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 w-64 animate-[fadeUp_0.2s_ease-out]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#06C755]/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">LINE สามหนึ่งพานิช</p>
                <p className="text-gray-500 text-[10px]">@31PANICH</p>
              </div>
            </div>
            <div className="bg-[#1e2035] rounded-xl p-3 mx-auto w-48 h-48 relative">
              <Image src="/line-qr.webp" alt="LINE QR Code" fill className="object-contain p-1" sizes="192px" />
            </div>
            <p className="text-center text-gray-400 text-[11px] mt-3">สแกน QR เพื่อแชทกับร้าน</p>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
              className="block text-center text-sm font-bold text-white bg-[#06C755] hover:bg-[#05b34d] rounded-xl py-2.5 mt-3 transition-colors">
              เพิ่มเพื่อนใน LINE
            </a>
          </div>
        )}

        <button
          onClick={handleLineClick}
          className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold text-sm px-4 py-3 rounded-full shadow-2xl shadow-black/40 border border-[#06C755]/30 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          <span className="hidden sm:inline">LINE</span>
        </button>

        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        `}</style>
      </div>
    )
  }

  // During hours: Phone + LINE
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Phone popover */}
      {showPhone && !isMobile && (
        <div ref={phoneRef} className="bg-[#14141f] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 w-72 animate-[fadeUp_0.2s_ease-out]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">โทรสั่งสินค้า</p>
              <p className="text-gray-500 text-[10px]">สามหนึ่งพานิช ลพบุรี</p>
            </div>
          </div>
          <a href={`tel:${PHONE_RAW}`} className="block text-center text-2xl font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3 transition-colors tracking-wide">{PHONE}</a>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>เวลาทำการ <strong className="text-white">{HOURS_TEXT}</strong> ทุกวัน</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>สั่งสินค้าล่วงหน้าอย่างน้อย <strong className="text-white">15 นาที</strong> ก่อนไปรับสินค้า</span>
            </div>
          </div>
        </div>
      )}

      {/* LINE popover */}
      {showLine && !isMobile && (
        <div ref={lineRef} className="bg-[#14141f] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 w-64 animate-[fadeUp_0.2s_ease-out]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#06C755]/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">LINE สามหนึ่งพานิช</p>
              <p className="text-gray-500 text-[10px]">@31PANICH</p>
            </div>
          </div>
          <div className="bg-[#1e2035] rounded-xl p-3 mx-auto w-48 h-48 relative">
            <Image src="/line-qr.webp" alt="LINE QR Code" fill className="object-contain p-1" sizes="192px" />
          </div>
          <p className="text-center text-gray-400 text-[11px] mt-3">สแกน QR เพื่อแชทกับร้าน</p>
          <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
            className="block text-center text-sm font-bold text-white bg-[#06C755] hover:bg-[#05b34d] rounded-xl py-2.5 mt-3 transition-colors">
            เพิ่มเพื่อนใน LINE
          </a>
        </div>
      )}

      {/* Main bar: Phone + LINE */}
      <div className="flex rounded-full overflow-hidden shadow-2xl shadow-purple-900/40 border border-purple-400/30">
        {/* Phone */}
        <button onClick={handlePhoneClick}
          className="flex items-center gap-2 bg-purple-950 hover:bg-purple-900 text-white font-bold text-sm pl-4 pr-3 py-3 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="hidden sm:inline">สั่งสินค้า</span>
        </button>

        {/* Divider */}
        <div className="w-px bg-purple-700/50"/>

        {/* LINE */}
        <button onClick={handleLineClick}
          className="flex items-center gap-1.5 bg-white hover:bg-purple-50 text-purple-950 font-bold text-sm px-3 py-3 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          <span className="hidden sm:inline">Line</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}
