import ContactLink from "@/components/ui/ContactLink"
import { PHONE, LINE_ID, HOURS_TEXT, ADDRESS, GOOGLE_MAPS_URL } from "@/lib/store-config"

export default function ContactSection() {
  return (
    <section className="bg-blue-900 text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">ติดต่อเรา</h2>
        <p className="text-blue-200 mb-2">เปิดบริการทุกวัน {HOURS_TEXT}</p>
        <p className="text-blue-200 mb-6">{ADDRESS}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <ContactLink
            type="phone"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            📞 โทร {PHONE}
          </ContactLink>
          <ContactLink
            type="line"
            className="bg-[#06C755] hover:bg-[#05b34d] text-white font-semibold px-8 py-3 rounded-full transition"
          >
            💬 แอดไลน์ {LINE_ID}
          </ContactLink>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            📍 นำทางด้วย Google Map
          </a>
        </div>
      </div>
    </section>
  )
}
