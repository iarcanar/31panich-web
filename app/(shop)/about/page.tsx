import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import ContactLink from "@/components/ui/ContactLink"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import { PHONE } from "@/lib/store-config"

export const metadata: Metadata = {
  title: "เกี่ยวกับสามหนึ่ง",
  description: "ร้านสามหนึ่งพานิช วัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา ศูนย์ผสมสี Beger TOA ลพบุรี",
}

const PRODUCT_SECTIONS = [
  {
    title: "อุปกรณ์ช่างแบรนด์คุณภาพ",
    description: "ตัวแทนจำหน่ายเครื่องมือช่างระดับโลกที่ช่างมืออาชีพเลือกใช้ รับประกันคุณภาพ ทนทานในการใช้งาน",
    brands: ["Makita", "Pumpkin", "Dongcheng", "Stanley", "iNG-CO", "Hugong", "Longwell", "Sumo"],
    gradient: "from-purple-700 via-blue-700 to-blue-800",
    categorySlug: "tools",
  },
  {
    title: "ตัวแทนจำหน่ายท่อประปา",
    description: "ตัวแทนอย่างเป็นทางการของอุตสาหกรรมท่อน้ำไทย มีท่อประปาและอุปกรณ์ครบวงจรสำหรับทุกงาน",
    brands: ["อุตสาหกรรมท่อน้ำไทย"],
    gradient: "from-blue-700 via-cyan-700 to-teal-800",
    categorySlug: "plumbing",
  },
  {
    title: "อุปกรณ์ห้องน้ำคุณภาพ",
    description: "อุปกรณ์ห้องน้ำจากแบรนด์ชั้นนำ รองรับทุกฟังก์ชันการใช้งาน ดีไซน์ทันสมัย ราคาเป็นมิตร",
    brands: ["Amazon", "VRH", "US", "Sanwa", "ANA"],
    gradient: "from-blue-800 via-indigo-700 to-purple-800",
    categorySlug: "plumbing",
  },
  {
    title: "อุปกรณ์ไฟฟ้ามาตรฐาน มอก.",
    description: "อุปกรณ์ไฟฟ้าคุณภาพสูง ปลอดภัย ได้มาตรฐาน มอก. สำหรับการติดตั้งและซ่อมแซมทุกประเภท",
    brands: ["Safe-T-Cut", "Hiet", "NPV", "Toshiba", "Bewon", "Panasonic", "Hatari"],
    gradient: "from-violet-700 via-purple-700 to-fuchsia-800",
    categorySlug: "electrical",
  },
  {
    title: "ศูนย์รับผสมสี",
    description: "ศูนย์ผสมสีโดยตรงจากเบเยอร์และ TOA เลือกเฉดสีได้ตามต้องการ รอรับได้ทันที พร้อมสีสเปรย์และสีอุตสาหกรรม",
    brands: ["Beger", "TOA"],
    gradient: "from-amber-700 via-orange-700 to-red-800",
    categorySlug: "paint",
  },
]

const BRAND_LOGOS = [
  { src: "/brands/makita.webp", name: "Makita" },
  { src: "/brands/bosch.webp", name: "Bosch" },
  { src: "/brands/dongcheng.webp", name: "Dongcheng(DC)" },
  { src: "/brands/pumpkin.webp", name: "Pumpkin" },
  { src: "/brands/ingco.webp", name: "iNGCO" },
  { src: "/brands/sumo.webp", name: "SUMO" },
  { src: "/brands/maktec.webp", name: "Maktec" },
  { src: "/brands/hugong.webp", name: "Hugong" },
  { src: "/brands/powertex.webp", name: "Powertex" },
  { src: "/brands/toshiba.webp", name: "Toshiba" },
  { src: "/brands/philips.webp", name: "Philips" },
  { src: "/brands/national.webp", name: "National" },
  { src: "/brands/thai-pipe.webp", name: "ท่อน้ำไทย" },
]

export default function AboutPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* Hero — P6: mobile taller via min-h + reduced gradient */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/front-store.webp"
          alt="หน้าร้านสามหนึ่งพานิช ลพบุรี"
          width={1920}
          height={800}
          priority
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e14] via-[#0e0e14]/50 to-[#0e0e14]/50" />
        <div className="relative container mx-auto px-4 pt-36 pb-24 md:py-32 text-center min-h-[280px]">
          <Image src="/logo.webp" alt="31 พานิช" width={80} height={80} className="mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">เกี่ยวกับสามหนึ่ง</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            ร้านค้าฮาร์ดแวร์ครบวงจรที่คุณไว้วางใจ
          </p>
          <p className="text-gray-400 mt-1">วัสดุก่อสร้าง ตกแต่งบ้าน อุปกรณ์ช่าง ครบจบที่เดียว</p>
        </div>
      </section>

      {/* P1: Section intro heading between hero and cards */}
      <section className="container mx-auto px-4 pt-10 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
            <h2 className="text-xl md:text-3xl font-bold text-white">สินค้าและบริการของเรา</h2>
          </div>

          {/* P1+P3: Top 3 cards — 3 columns with CTA links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCT_SECTIONS.slice(0, 3).map((section) => (
              <div key={section.title} className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${section.gradient} px-5 py-4`}>
                  <h3 className="text-white font-bold text-sm md:text-base">{section.title}</h3>
                </div>
                <div className="px-5 py-4">
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">{section.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {section.brands.map((brand) => (
                      <span key={brand} className="text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-400/20 rounded-full px-2.5 py-1">
                        {brand}
                      </span>
                    ))}
                  </div>
                  <Link href={`/products/${section.categorySlug}`} className="text-cyan-400 text-xs font-medium hover:text-cyan-300 transition">
                    ดูสินค้าในหมวดนี้ &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* P3: Bottom 2 cards — ไฟฟ้า 2/3 + ศูนย์ผสมสี 1/3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {PRODUCT_SECTIONS.slice(3).map((section, i) => (
              <div key={section.title} className={`bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden ${i === 0 ? "md:col-span-2" : "md:col-span-1"}`}>
                <div className={`bg-gradient-to-r ${section.gradient} px-5 py-4`}>
                  <h3 className="text-white font-bold text-sm md:text-base">{section.title}</h3>
                </div>
                <div className="px-5 py-4">
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">{section.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {section.brands.map((brand) => (
                      <span key={brand} className="text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-400/20 rounded-full px-2.5 py-1">
                        {brand}
                      </span>
                    ))}
                  </div>
                  <Link href={`/products/${section.categorySlug}`} className="text-cyan-400 text-xs font-medium hover:text-cyan-300 transition">
                    ดูสินค้าในหมวดนี้ &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision + Brand Logos with background image */}
      <div className="relative">
        <Image
          src="/bg-about-store.webp"
          alt=""
          fill
          className="object-cover object-top opacity-80"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14] via-[#0e0e14]/80 to-[#0e0e14]" />

        {/* P4: Vision — trimmed text + stat bar */}
        <section className="relative py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">เราบริหารงานโดยยึดหลัก</h2>
            <blockquote className="relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-5xl text-purple-500/30 font-serif select-none">&ldquo;</div>
              <p className="text-lg md:text-xl text-cyan-300 font-medium leading-relaxed pt-4">
                ให้ความจริงใจ ความซื่อสัตย์<br />
                แนะนำช่วยเหลือลูกค้าให้ถึงที่สุดเท่าที่เราจะช่วยได้
              </p>
              <div className="text-5xl text-purple-500/30 font-serif select-none mt-2">&rdquo;</div>
            </blockquote>

            <div className="mt-6 text-gray-400 text-sm leading-relaxed max-w-xl mx-auto space-y-2">
              <p>ลูกค้าส่วนใหญ่เป็นลูกค้าประจำหลายปี — แนะนำกันปากต่อปาก</p>
              <p className="text-white font-medium">เราไม่หยุดพัฒนาคุณภาพและบริการ เพื่อให้ลูกค้าได้รับสิ่งที่ดีที่สุด</p>
            </div>

            {/* Stat bar */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div>
                <p className="text-2xl md:text-3xl font-black text-white">20+</p>
                <p className="text-gray-500 text-xs mt-1">ปีประสบการณ์</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-white">50+</p>
                <p className="text-gray-500 text-xs mt-1">แบรนด์ชั้นนำ</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-amber-400">4.9</p>
                <p className="text-gray-500 text-xs mt-1">Google Rating</p>
              </div>
            </div>
          </div>
        </section>

        {/* P8: Google Review strip — social proof */}
        <div className="relative">
          <GoogleReviewStrip />
        </div>

        {/* P5: Brand Logos — reduced white circle contrast */}
        <section className="relative border-t border-white/5 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-2">
              แบรนด์ที่จำหน่าย
            </h2>
            <p className="text-gray-400 text-center mb-12">
              ตัวแทนจำหน่ายแบรนด์ชั้นนำ รับประกันคุณภาพ
            </p>

            <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
              {BRAND_LOGOS.map((brand) => (
                <div
                  key={brand.name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/90 border-2 border-white/10 flex items-center justify-center p-4 shadow-lg shadow-black/20 hover:scale-110 hover:border-cyan-400/50 hover:shadow-cyan-400/10 transition-all duration-300"
                  title={brand.name}
                >
                  <Image
                    src={brand.src}
                    alt={brand.name}
                    width={80}
                    height={80}
                    className="object-contain max-h-16 md:max-h-20"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* P7: CTA section before footer */}
      <section className="bg-[#0e0e14] py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">สนใจสินค้า?</h2>
          <p className="text-gray-400 text-sm mb-6">ติดต่อเราได้เลย — พร้อมให้คำปรึกษาทุกวัน</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ContactLink type="phone" className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
              {PHONE}
            </ContactLink>
            <ContactLink type="line" className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
              LINE สอบถาม
            </ContactLink>
            <Link href="/products" className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
              ดูสินค้าทั้งหมด
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
