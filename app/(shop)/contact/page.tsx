import { Metadata } from "next"
import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import { PHONE, EMAIL, FB_URL, GOOGLE_MAPS_URL, GEO, LINE_ID, HOURS_TEXT, STORE_NAME } from "@/lib/store-config"

export const metadata: Metadata = {
  title: "ติดต่อสามหนึ่ง",
  description: `ติดต่อร้านสามหนึ่งพานิช ${PHONE} LINE ${LINE_ID} ลพบุรี เปิดทุกวัน ${HOURS_TEXT}`,
}

export default function ContactPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/bg-contact.webp"
          alt=""
          width={1920}
          height={823}
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14]/60 via-[#0e0e14]/40 to-[#0e0e14]" />
        <div className="relative container mx-auto px-4 pt-28 pb-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">ติดต่อสามหนึ่ง</h1>
          <p className="text-gray-300">ยินดีให้บริการทุกวัน ไม่มีวันหยุด</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* ข้อมูลติดต่อ */}
          <div className="bg-[#1a1a28] border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">ร้าน{STORE_NAME}</h2>
            <p className="text-gray-500 text-sm mb-6">หจก.สามหนึ่งพานิช (ทะเบียน 0163564000495)</p>

            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">📍</span>
                <p className="text-sm">99/1 หมู่ 7 ต.เขาพระงาม อ.เมือง จ.ลพบุรี 15160<br />
                  <span className="text-gray-500">เยื้องตลาดสดเสาธง หน้าทางเข้าค่ายภูมิพลฯ</span>
                </p>
              </div>

              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <span className="text-lg">🕒</span>
                <p className="text-amber-400 font-semibold text-sm">เปิดทุกวัน {HOURS_TEXT}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <ContactLink type="phone" className="text-cyan-400 hover:underline font-semibold">{PHONE}</ContactLink>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">💬</span>
                <ContactLink type="line" className="text-cyan-400 hover:underline">LINE: {LINE_ID}</ContactLink>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">✉️</span>
                <a href={`mailto:${EMAIL}`} className="text-cyan-400 hover:underline">{EMAIL}</a>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">📘</span>
                <a href={FB_URL} className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">Facebook: {STORE_NAME}</a>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <ContactLink
                type="line"
                className="bg-[#06C755] text-white font-semibold px-6 py-3 rounded-full text-center hover:brightness-110 transition text-sm"
              >
                💬 แอดไลน์สอบถาม
              </ContactLink>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 text-white font-semibold px-6 py-3 rounded-full text-center hover:bg-white/20 transition text-sm"
              >
                📍 นำทาง Google Map
              </a>
            </div>
          </div>

          {/* Map section */}
          <div className="flex flex-col gap-4">
            {/* แผนที่แบบภาพ */}
            <div className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden p-4">
              <Image
                src="/map-31.webp"
                alt="แผนที่ร้านสามหนึ่งพานิช ลพบุรี เยื้องตลาดสดเสาธง หน้าค่ายภูมิพลฯ"
                width={600}
                height={600}
                className="w-full h-auto rounded-xl"
              />
            </div>

            {/* Google Map embed */}
            <div className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden">
              <iframe
                src={`https://maps.google.com/maps?q=${GEO.lat},${GEO.lng}&z=15&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 280 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="แผนที่ร้านสามหนึ่งพานิช"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
