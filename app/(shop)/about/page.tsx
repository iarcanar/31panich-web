import { Metadata } from "next"
import Image from "next/image"

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
  },
  {
    title: "ตัวแทนจำหน่ายท่อประปา",
    description: "ตัวแทนอย่างเป็นทางการของอุตสาหกรรมท่อน้ำไทย มีท่อประปาและอุปกรณ์ครบวงจรสำหรับทุกงาน",
    brands: ["อุตสาหกรรมท่อน้ำไทย"],
    gradient: "from-blue-700 via-cyan-700 to-teal-800",
  },
  {
    title: "อุปกรณ์ห้องน้ำคุณภาพ",
    description: "อุปกรณ์ห้องน้ำจากแบรนด์ชั้นนำ รองรับทุกฟังก์ชันการใช้งาน ดีไซน์ทันสมัย ราคาเป็นมิตร",
    brands: ["Amazon", "VRH", "US", "Sanwa", "ANA"],
    gradient: "from-blue-800 via-indigo-700 to-purple-800",
  },
  {
    title: "อุปกรณ์ไฟฟ้ามาตรฐาน มอก.",
    description: "อุปกรณ์ไฟฟ้าคุณภาพสูง ปลอดภัย ได้มาตรฐาน มอก. สำหรับการติดตั้งและซ่อมแซมทุกประเภท",
    brands: ["Safe-T-Cut", "Hiet", "NPV", "Toshiba", "Bewon", "Panasonic", "Hatari"],
    gradient: "from-violet-700 via-purple-700 to-fuchsia-800",
  },
  {
    title: "ศูนย์รับผสมสี",
    description: "ศูนย์ผสมสีโดยตรงจากเบเยอร์และ TOA เลือกเฉดสีได้ตามต้องการ รอรับได้ทันที พร้อมสีสเปรย์และสีอุตสาหกรรม",
    brands: ["Beger", "TOA"],
    gradient: "from-amber-700 via-orange-700 to-red-800",
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
      {/* Hero */}
      <section className="relative overflow-hidden -mt-14 lg:mt-0">
        <Image
          src="/front-store.webp"
          alt="หน้าร้านสามหนึ่งพานิช ลพบุรี"
          width={1920}
          height={800}
          priority
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e14] via-[#0e0e14]/70 to-[#0e0e14]/40" />
        <div className="relative container mx-auto px-4 pt-36 pb-24 md:py-32 text-center">
          <Image src="/logo.webp" alt="31 พานิช" width={80} height={80} className="mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">เกี่ยวกับสามหนึ่ง</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            ร้านค้าฮาร์ดแวร์ครบวงจรที่คุณไว้วางใจ
          </p>
          <p className="text-gray-400 mt-1">วัสดุก่อสร้าง ตกแต่งบ้าน อุปกรณ์ช่าง ครบจบที่เดียว</p>
        </div>
      </section>

      {/* Product & Brand Categories */}
      <section className="container mx-auto px-4 pb-16 -mt-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {PRODUCT_SECTIONS.slice(0, 3).map((section) => (
            <div key={section.title} className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${section.gradient} px-5 py-4`}>
                <h3 className="text-white font-bold text-sm md:text-base">{section.title}</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-gray-400 text-xs leading-relaxed mb-4">{section.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {section.brands.map((brand) => (
                    <span key={brand} className="text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-400/20 rounded-full px-2.5 py-1">
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto mt-4">
          {PRODUCT_SECTIONS.slice(3).map((section) => (
            <div key={section.title} className="bg-[#1a1a28] border border-white/10 rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${section.gradient} px-5 py-4`}>
                <h3 className="text-white font-bold text-sm md:text-base">{section.title}</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-gray-400 text-xs leading-relaxed mb-4">{section.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {section.brands.map((brand) => (
                    <span key={brand} className="text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-400/20 rounded-full px-2.5 py-1">
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
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

        {/* Vision */}
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

            <div className="mt-8 space-y-4 text-gray-400 text-sm leading-relaxed max-w-xl mx-auto">
              <p>เหมือนลูกค้าเป็นเพื่อน เป็นคนในครอบครัว</p>
              <p>ลูกค้าส่วนใหญ่จึงเป็นลูกค้าประจำที่ซื้อขายกันมายาวนานหลายปี มีการแนะนำกันปากต่อปาก</p>
              <p>เราจึงได้ลูกค้าใหม่เพิ่มขึ้นเรื่อยๆ แต่อย่างไรก็ตาม</p>
              <p className="text-white font-medium">เราก็ยังไม่หยุดพัฒนาคุณภาพและบริการ<br />เพื่อให้ลูกค้าได้รับสิ่งที่ดีที่สุดอยู่เสมอ</p>
            </div>
          </div>
        </section>

        {/* Brand Logos */}
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
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/95 border-2 border-white/20 flex items-center justify-center p-4 hover:scale-110 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/10 transition-all duration-300"
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
    </div>
  )
}
