import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import { LINE_URL, PHONE, HOURS_TEXT, EMAIL, FB_URL, LINE_ID, STORE_NAME, STORE_NAME_FULL } from "@/lib/store-config"

export default function Footer() {
  return (
    <footer className="bg-[#08080e] text-gray-500 border-t border-white/5">
      {/* === Mobile layout === */}
      <div className="lg:hidden px-5 py-6">
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-white font-bold text-base">{STORE_NAME}</p>

          <div className="flex items-center gap-5">
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <Image src="/line-qr.webp" alt={`LINE ${LINE_ID}`} width={64} height={64} className="rounded-lg" />
              <p className="text-[10px] text-gray-600 text-center mt-1">สแกนแอดไลน์</p>
            </a>

            <div className="text-xs space-y-1.5 text-left">
              <p className="text-gray-400">เปิดทุกวัน <span className="text-white font-medium">{HOURS_TEXT}</span></p>
              <p><ContactLink type="phone" className="text-white hover:text-cyan-400 transition">{PHONE}</ContactLink></p>
              <p><ContactLink type="line" className="text-white hover:text-cyan-400 transition">LINE {LINE_ID}</ContactLink></p>
              <p><a href={FB_URL} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition">FB {STORE_NAME}</a></p>
            </div>
          </div>
        </div>
      </div>

      {/* === Desktop layout === */}
      <div className="hidden lg:block max-w-5xl mx-auto px-8 py-12">
        <div className="flex items-start justify-between gap-12">
          {/* Left — Store name + hours */}
          <div>
            <p className="text-white font-bold text-xl tracking-tight mb-3">{STORE_NAME_FULL}</p>
            <p className="text-sm text-gray-500">ร้านวัสดุก่อสร้างครบวงจร จ.ลพบุรี</p>
            <p className="text-xs text-gray-600 mt-1">ทะเบียน 0163564000495</p>
            <p className="text-sm text-white mt-2">เปิดทุกวัน {HOURS_TEXT}</p>
          </div>

          {/* Center — Contact */}
          <div className="space-y-2.5 text-sm">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">ติดต่อ</p>
            <ContactLink type="phone" className="block text-white hover:text-cyan-400 transition">{PHONE}</ContactLink>
            <a href={`mailto:${EMAIL}`} className="block text-white hover:text-cyan-400 transition">{EMAIL}</a>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="block text-white hover:text-cyan-400 transition">Facebook — {STORE_NAME}</a>
          </div>

          {/* Right — LINE QR */}
          <div className="flex flex-col items-center gap-2">
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer">
              <Image src="/line-qr.webp" alt={`LINE ${LINE_ID}`} width={96} height={96} className="rounded-lg" />
            </a>
            <p className="text-xs text-gray-500">LINE {LINE_ID}</p>
          </div>
        </div>
      </div>

      {/* Copyright & Version */}
      <div className="border-t border-white/5 py-4 text-center text-[11px] text-gray-600">
        <p>© {new Date().getFullYear()} {STORE_NAME} จ.ลพบุรี</p>
        <p className="mt-1 text-gray-700">f {process.env.NEXT_PUBLIC_APP_VERSION} · last update {process.env.NEXT_PUBLIC_BUILD_DATE}</p>
      </div>
    </footer>
  )
}
