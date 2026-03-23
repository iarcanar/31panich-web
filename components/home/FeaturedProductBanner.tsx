import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import { PHONE } from "@/lib/store-config"

export default function FeaturedProductBanner() {
  return (
    <section className="bg-[#0e0e14] py-10 md:py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8 md:mb-10">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-400 to-red-500" />
          <h2 className="text-lg md:text-2xl font-bold text-white">โปรโมชั่นล่าสุด</h2>
        </div>
        <div className="space-y-16">
          {/* === BEWON LED Promo — Static Image + Facebook Link === */}
          <div className="relative rounded-2xl overflow-hidden bg-[#1a1a28] border border-white/10 shadow-lg">
            <a
              href="https://www.facebook.com/reel/1668814937620528"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Image
                src="/promotions/bewon-led.webp"
                alt="BEWON LED หลอดไฟ LED สว่างนาน ไม่กลัวดับ โปรโมชั่นพิเศษ"
                width={1200}
                height={670}
                className="w-full h-auto"
                priority
              />
            </a>

            {/* ข้อมูลด้านล่าง + Facebook / LINE / โทร */}
            <div className="px-6 py-4 md:px-8 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-blue-200/80 text-sm italic mb-0.5">สว่างนาน...ไม่กลัวดับ!</p>
                <p className="text-white/50 text-xs">วันนี้ - 31 มี.ค. 69 หรือจนกว่าสินค้าจะหมด</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <a
                  href="https://www.facebook.com/reel/1668814937620528"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold px-5 py-2.5 rounded-full text-xs md:text-sm transition"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  กดไลค์ Facebook
                </a>
                <ContactLink type="line" className="bg-white/10 text-white font-bold px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm hover:bg-white/20 transition">
                  สอบถามผ่าน LINE
                </ContactLink>
                <ContactLink type="phone" className="bg-white/10 text-white font-bold px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm hover:bg-white/20 transition">
                  {PHONE}
                </ContactLink>
              </div>
            </div>
          </div>

          {/* === IS-ON Lock Promo — แถบกว้าง compact === */}
          <div className="relative">
            <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/20">
              {/* Stripe pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 22px)" }} />

              <div className="relative flex flex-row items-end">
                {/* Image — ชนขอบล่าง card */}
                <div className="relative w-[120px] md:w-[280px] shrink-0 self-end">
                  <Image
                    src="https://res.cloudinary.com/docoo51xb/image/upload/v1768380684/ison_pack06_oexfv3.png"
                    alt="กุญแจ IS-ON แพ็คเกจรักษ์โลก"
                    width={400}
                    height={400}
                    className="relative z-10 w-full object-contain object-bottom drop-shadow-2xl"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 px-3 py-3 md:py-8 md:px-6">
                  <p className="text-white/80 text-[10px] md:text-sm font-medium">IS-ON (อิส-ออน)</p>
                  <h3 className="text-sm md:text-3xl font-extrabold text-white leading-tight">
                    กุญแจ แพ็คเกจรักษ์โลก
                  </h3>
                  <p className="text-white/70 text-[10px] md:text-sm mb-2 md:mb-5">
                    แข็งแรง ทนทาน ล็อคบ้าน ล็อครั้ว ล็อคโกดัง จบ!
                  </p>

                  {/* Price tags */}
                  <div className="flex items-center gap-1.5 md:gap-3 mb-2 md:mb-5">
                    <div className="bg-white rounded-lg px-2 py-1 md:px-4 md:py-2 text-center -rotate-2 shadow-lg">
                      <p className="text-orange-500 text-[10px] md:text-xs font-bold">ซื้อปลีก</p>
                      <p className="text-gray-900 text-lg md:text-3xl font-black leading-none">80<span className="text-[10px] md:text-base font-bold ml-0.5">.-</span></p>
                      <p className="text-gray-400 text-[10px] md:text-xs line-through">200 บาท</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg px-2 py-1 md:px-4 md:py-2 text-center rotate-2 shadow-lg border border-amber-400 md:border-2">
                      <p className="text-amber-400 text-[10px] md:text-xs font-bold">ซื้อครบ 500</p>
                      <p className="text-white text-lg md:text-3xl font-black leading-none">40<span className="text-[10px] md:text-base font-bold ml-0.5">.-</span></p>
                      <p className="text-amber-400/60 text-[10px] md:text-xs">แลกซื้อได้เลย!</p>
                    </div>
                    <p className="text-white/50 text-[10px] md:text-xs italic">*จำนวนจำกัด</p>
                  </div>

                  {/* CTA */}
                  <div className="flex gap-1.5 md:gap-3">
                    <ContactLink type="line" className="bg-white/15 backdrop-blur text-white font-bold px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-sm hover:bg-white/25 transition">
                      สอบถามผ่าน LINE
                    </ContactLink>
                    <ContactLink type="phone" className="bg-white/15 backdrop-blur text-white font-bold px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-sm hover:bg-white/25 transition">
                      {PHONE}
                    </ContactLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
