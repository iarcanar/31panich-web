import { Metadata } from "next"
import Image from "next/image"
import ContactLink from "@/components/ui/ContactLink"
import SectionHeader from "@/components/home/SectionHeader"
import { PHONE } from "@/lib/store-config"
import { breadcrumbSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "การรับประกัน",
  description: "นโยบายการรับประกันสินค้า Makita Dongcheng iNGCO Pumpkin ร้านสามหนึ่งพานิช ลพบุรี",
  openGraph: {
    title: "การรับประกันสินค้า สามหนึ่งพานิช",
    description: "ลงทะเบียนรับประกัน Makita Dongcheng iNGCO Pumpkin ออนไลน์",
    images: [{ url: "/bg-warranty.webp", width: 1920, height: 800, alt: "การรับประกันสินค้า สามหนึ่งพานิช" }],
  },
}

const breadcrumb = breadcrumbSchema([
  { name: "หน้าแรก", url: "/" },
  { name: "การรับประกัน" },
])

const brands = [
  {
    name: "Makita",
    image: "/warranty/makita.webp",
    href: "https://mymakita.in.th/",
    description: "ลงทะเบียนรับประกันสินค้า Makita",
  },
  {
    name: "Dongcheng(DC) ดีจริง",
    image: "/warranty/dc.webp",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScxO-kl7Dgmb6fLBm14rNssrW6Y5I_HscWyzVTCaRZ3AcBrXA/viewform?pli=1",
    description: "ลงทะเบียนรับประกันสินค้า DC ดีจริง",
  },
  {
    name: "Pumpkin",
    image: "/warranty/pumpkin.webp",
    href: "https://page.line.me/tdz7899a?openQrModal=true",
    description: "ลงทะเบียนรับประกันสินค้า Pumpkin ผ่าน LINE",
  },
  {
    name: "KTW Group",
    subtitle: "Polo, Marathon, Valu, Theos, Alpha",
    image: "/warranty/ktw.webp",
    href: "https://ktw.co.th/brandwarranty",
    description: "ลงทะเบียนรับประกันสินค้าเกรียงไทยวัฒนากรุ๊ป",
  },
]

export default function WarrantyPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Hero Banner */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/bg-warranty.webp"
          alt=""
          width={1920}
          height={823}
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14]/85 via-[#0e0e14]/65 to-[#0e0e14]" />
        <div className="relative container mx-auto px-4 pt-24 pb-12 md:py-20">
          <SectionHeader
            title="การรับประกัน"
            subtitle="นโยบายการรับประกันสินค้าจากร้านสามหนึ่งพานิช"
            theme="emerald"
            subtle
          />
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">

        <div className="max-w-4xl mx-auto space-y-10">
          {/* Brand registration links — ใช้บ่อยสุด วางบนสุด */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 text-center">ลงทะเบียนรับประกันออนไลน์</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {brands.map((brand) => (
                <a
                  key={brand.name}
                  href={brand.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-[#1a1a28] border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-cyan-400/50 hover:bg-[#1e1e30] transition-all"
                >
                  <div className="w-full aspect-square relative overflow-hidden rounded-xl">
                    <Image
                      src={brand.image}
                      alt={brand.description}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-semibold">{brand.name}</p>
                    {brand.subtitle && (
                      <p className="text-gray-500 text-xs mt-0.5">{brand.subtitle}</p>
                    )}
                  </div>
                  <span className="text-cyan-400 text-xs font-medium group-hover:underline">
                    ลงทะเบียน →
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Warranty conditions table — พื้นหลังสว่างขึ้นเพราะรูปมีข้อความสีดำ */}
          <div className="bg-[#f5f5f5] border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">เงื่อนไขการรับประกันสินค้า</h2>
            <div className="overflow-hidden rounded-xl">
              <Image
                src="/warranty/general-rules.webp"
                alt="เงื่อนไขการรับประกันสินค้า - Makita 6 เดือน-1 ปี, iNGCO 1 ปี, DC ดีจริง 1 ปี, Pumpkin 1 ปี"
                width={800}
                height={480}
                className="w-full h-auto rounded-xl"
              />
            </div>
            <p className="text-amber-600 text-sm mt-4 text-center font-medium">* ควรลงทะเบียนทันทีหลังจากซื้อสินค้า หรือภายใน 14 วัน</p>
          </div>

          {/* General Policy */}
          <div className="bg-[#1a1a28] border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-4">นโยบายทั่วไป</h2>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-0.5">✓</span>
                <span>สินค้าทุกชิ้นรับประกันตามเงื่อนไขของผู้ผลิตแต่ละแบรนด์</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-0.5">✓</span>
                <span>กรุณาเก็บใบเสร็จรับเงินไว้เป็นหลักฐานในการเคลมประกัน</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-0.5">✓</span>
                <span>สินค้าที่อยู่ในเงื่อนไขประกัน สามารถนำมาเปลี่ยนหรือซ่อมได้ที่ร้าน</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-0.5">✓</span>
                <span>ระยะเวลาการรับประกันขึ้นอยู่กับแต่ละแบรนด์และประเภทสินค้า</span>
              </li>
            </ul>
          </div>

          {/* Contact for warranty */}
          <div className="bg-[#1a1a28] border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold text-white mb-3">สอบถามเรื่องการรับประกัน</h2>
            <p className="text-gray-400 text-sm mb-6">ติดต่อเราเพื่อสอบถามรายละเอียดการรับประกันสินค้าแต่ละรายการ</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ContactLink
                type="line"
                className="bg-[#06C755] text-white font-semibold px-6 py-3 rounded-full hover:brightness-110 transition text-sm"
              >
                สอบถามผ่าน LINE
              </ContactLink>
              <ContactLink
                type="phone"
                className="bg-white/10 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/20 transition text-sm"
              >
                โทร {PHONE}
              </ContactLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
