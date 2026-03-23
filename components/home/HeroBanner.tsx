import Image from "next/image"
import Link from "next/link"
import ContactLink from "@/components/ui/ContactLink"
import { PHONE, EMAIL, FB_URL, GOOGLE_MAPS_URL, STORE_NAME } from "@/lib/store-config"

export default function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            ร้านสามหนึ่งพานิช
          </h1>
          <p className="mt-4 text-lg text-blue-200">
            ร้านอยู่เยื้องตลาดสดเสาธง บริเวณหน้าทางเข้าค่ายภูมิพลฯ (ศูนย์ปืนใหญ่) จ.ลพบุรี
          </p>

          {/* Contact Cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md mx-auto md:mx-0">
            <ContactLink type="phone" className="flex items-center gap-3 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition">
              <span className="text-2xl">📞</span>
              <div className="text-left">
                <div className="text-xs text-blue-300">เบอร์โทรศัพท์</div>
                <div className="font-semibold">{PHONE}</div>
              </div>
            </ContactLink>
            <ContactLink type="line" className="flex items-center gap-3 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition">
              <span className="text-2xl">💬</span>
              <div className="text-left">
                <div className="text-xs text-blue-300">LINE Official</div>
                <div className="font-semibold">@31panich</div>
              </div>
            </ContactLink>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition">
              <span className="text-2xl">✉️</span>
              <div className="text-left">
                <div className="text-xs text-blue-300">อีเมล</div>
                <div className="font-semibold text-sm">{EMAIL}</div>
              </div>
            </a>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition">
              <span className="text-2xl">📘</span>
              <div className="text-left">
                <div className="text-xs text-blue-300">เฟซบุ๊ก</div>
                <div className="font-semibold">{STORE_NAME}</div>
              </div>
            </a>
          </div>

          {/* Google Map Button */}
          <div className="mt-6">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-full hover:bg-blue-50 transition"
            >
              📍 นำทางด้วย Google Map
            </a>
          </div>
        </div>

        {/* Map Image Placeholder */}
        <div className="flex-1 max-w-md">
          <div className="bg-white/10 rounded-xl p-4 aspect-square flex items-center justify-center text-gray-400">
            {/* TODO: ใส่รูปแผนที่จากเว็บเดิม */}
            <p className="text-center text-sm">แผนที่ร้าน</p>
          </div>
        </div>
      </div>
    </section>
  )
}
