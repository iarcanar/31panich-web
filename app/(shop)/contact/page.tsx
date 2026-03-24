import { Metadata } from "next"
import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import { localBusinessSchema } from "@/lib/structured-data"
import { PHONE, EMAIL, FB_URL, GOOGLE_MAPS_URL, GEO, LINE_ID, LINE_URL, HOURS_TEXT, STORE_NAME } from "@/lib/store-config"

export const metadata: Metadata = {
  title: "ติดต่อสามหนึ่ง",
  description: `ติดต่อร้านสามหนึ่งพานิช ${PHONE} LINE ${LINE_ID} ลพบุรี เปิดทุกวัน ${HOURS_TEXT}`,
}

/* Inline SVG icons — consistent size + color, no emoji rendering issues */
function IconPin({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
}
function IconClock({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function IconPhone({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
}
function IconChat({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
}
function IconMail({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
}
function IconFacebook({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
}

export default function ContactPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* P5: LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* P3: Hero — enhanced with hours + phone + CTA */}
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
        <div className="relative container mx-auto px-4 pt-28 pb-12 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">ติดต่อสามหนึ่ง</h1>
          <p className="text-gray-300">ยินดีให้บริการทุกวัน ไม่มีวันหยุด</p>
          <p className="text-amber-400 font-semibold text-sm mt-3">เปิดทุกวัน {HOURS_TEXT}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <ContactLink
              type="phone"
              className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-5 py-2 rounded-full transition"
            >
              {PHONE}
            </ContactLink>
            <ContactLink
              type="line"
              className="bg-[#06C755] text-white text-sm font-semibold px-5 py-2 rounded-full hover:brightness-110 transition"
            >
              LINE สอบถาม
            </ContactLink>
          </div>
        </div>
      </section>

      {/* P1+P6: Hand-drawn map — full-width banner, desktop only */}
      <section className="hidden md:block max-w-6xl mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden p-4">
          <Image
            src="/map-31.webp"
            alt="แผนที่ร้านสามหนึ่งพานิช ลพบุรี เยื้องตลาดสดเสาธง หน้าค่ายภูมิพลฯ"
            width={1200}
            height={600}
            className="w-full h-auto rounded-xl"
          />
        </div>
      </section>

      {/* Main content: contact info + Google Map */}
      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* ข้อมูลติดต่อ — P4: SVG icons */}
          <div className="bg-[#1a1a28] border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-1">ร้าน{STORE_NAME}</h2>
            <p className="text-gray-500 text-xs mb-6">หจก.สามหนึ่งพานิช (ทะเบียน 0163564000495)</p>

            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <IconPin className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <p className="text-sm">99/1 หมู่ 7 ต.เขาพระงาม อ.เมือง จ.ลพบุรี 15160<br />
                  <span className="text-gray-500">เยื้องตลาดสดเสาธง หน้าทางเข้าค่ายภูมิพลฯ</span>
                </p>
              </div>

              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <IconClock className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-amber-400 font-semibold text-sm">เปิดทุกวัน {HOURS_TEXT}</p>
              </div>

              <div className="flex items-center gap-3">
                <IconPhone className="w-5 h-5 text-cyan-400 shrink-0" />
                <ContactLink type="phone" className="text-cyan-400 hover:underline font-semibold">{PHONE}</ContactLink>
              </div>

              <div className="flex items-center gap-3">
                <IconChat className="w-5 h-5 text-cyan-400 shrink-0" />
                <ContactLink type="line" className="text-cyan-400 hover:underline">LINE: {LINE_ID}</ContactLink>
              </div>

              <div className="flex items-center gap-3">
                <IconMail className="w-5 h-5 text-cyan-400 shrink-0" />
                <a href={`mailto:${EMAIL}`} className="text-cyan-400 hover:underline">{EMAIL}</a>
              </div>

              <div className="flex items-center gap-3">
                <IconFacebook className="w-5 h-5 text-cyan-400 shrink-0" />
                <a href={FB_URL} className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">Facebook: {STORE_NAME}</a>
              </div>
            </div>

            {/* P7: LINE QR — small, desktop only (footer already has QR on all pages) */}
            <div className="hidden md:flex items-center gap-4 mt-6 pt-6 border-t border-white/5">
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Image src="/line-qr.webp" alt={`LINE ${LINE_ID}`} width={64} height={64} className="rounded-lg" />
              </a>
              <div>
                <p className="text-white text-sm font-medium">สแกนแอดไลน์</p>
                <p className="text-gray-500 text-xs mt-0.5">LINE: {LINE_ID}</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <ContactLink
                type="line"
                className="bg-[#06C755] text-white font-semibold px-6 py-3 rounded-full text-center hover:brightness-110 transition text-sm"
              >
                แอดไลน์สอบถาม
              </ContactLink>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 text-white font-semibold px-6 py-3 rounded-full text-center hover:bg-white/20 transition text-sm"
              >
                นำทาง Google Map
              </a>
            </div>
          </div>

          {/* P1+P2: Google Map embed only (hand-drawn map moved to full-width above) */}
          <div className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden">
            <iframe
              src={`https://maps.google.com/maps?q=${GEO.lat},${GEO.lng}&z=15&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="แผนที่ร้านสามหนึ่งพานิช"
            />
          </div>
        </div>
      </section>

      {/* P8: Google Review strip */}
      <GoogleReviewStrip />
    </div>
  )
}
