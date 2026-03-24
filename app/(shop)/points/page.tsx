import { Metadata } from "next"
import Image from "next/image"
import HowToCollect from "@/components/points/HowToCollect"
import { LINE_POINTS_URL } from "@/lib/store-config"
import { breadcrumbSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "แต้มสามหนึ่ง",
  description: "สะสมแต้มสามหนึ่ง ซื้อสินค้าครบ 500 บาท รับ 1 แต้ม แลกของรางวัลมากมาย ร้านสามหนึ่งพานิช ลพบุรี",
  openGraph: {
    title: "แต้มสามหนึ่ง — สะสมแต้มแลกรางวัล",
    description: "ซื้อสินค้าครบ 500 บาท รับ 1 แต้ม แลกของรางวัลมากมาย",
    images: [{ url: "/31point.webp", alt: "แต้มสามหนึ่ง" }],
  },
}

const breadcrumb = breadcrumbSchema([
  { name: "หน้าแรก", url: "/" },
  { name: "แต้มสามหนึ่ง" },
])

const REWARDS = [
  { image: "/points/reward-200.webp", name: "สว่านกระแทกไร้สาย BOXER 128V 3 ระบบ", points: 200 },
  { image: "/points/reward-100-cooker.webp", name: "หม้ออเนกประสงค์ SMARTHOME Multi Cooker", points: 100 },
  { image: "/points/reward-100-zootopia.webp", name: "ชุดผ้าปูที่นอน Zootopia ครบเซ็ท", points: 100 },
  { image: "/points/reward-40-60.webp", name: "เก้าอี้แคมป์ปิ้ง พับเก็บได้ (size เล็ก 40 / ใหญ่ 60)", points: 40 },
  { image: "/points/reward-50.webp", name: "กล่องตั้งแคมป์ อเนกประสงค์ จุของได้เยอะ พับเก็บได้", points: 50 },
  { image: "/points/reward-40-lamp.webp", name: "โคมตะเกียงแคมป์ปิ้ง มีทั้งแบบชาร์จแบต-ใส่ถ่าน", points: 40 },
  { image: "/points/reward-20-glass.webp", name: "แก้วเก็บความเย็น เย็นนาน เย็นเจี๊ยบ", points: 20 },
  { image: "/points/reward-20-bottle.webp", name: "เซ็ทแก้วเก็บความเย็น-ร้อน 31PANICH", points: 20 },
  { image: "/points/reward-10.webp", name: "เสื้อยืดสามหนึ่ง Limited Edition เลือกได้หลายแบบ", points: 10 },
]

export default function PointsPage() {
  return (
    <div className="min-h-screen relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/points/bg.webp"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Hero */}
      <section>
        <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center text-center">
          <Image
            src="/points/hero.webp"
            alt="เทศกาลแลกแต้ม 2026"
            width={800}
            height={600}
            className="w-full max-w-2xl h-auto rounded-2xl shadow-2xl"
            priority
          />
        </div>
      </section>

      {/* วิธีสะสม */}
      <section className="container mx-auto px-4 -mt-6 relative z-10">
        <HowToCollect />
      </section>

      {/* รางวัล */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          รางวัลล็อตแรกพร้อมให้แลกวันนี้!
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-amber-500 mx-auto mt-3 mb-10 rounded-full" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {REWARDS.map((item) => (
            <div
              key={item.name}
              className="bg-[#1a1a28]/80 backdrop-blur rounded-2xl overflow-hidden border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
            >
              <div className="aspect-square relative overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="text-white font-medium leading-snug text-sm">{item.name}</h3>
                <p className="text-amber-400 font-bold text-lg mt-2">{item.points} แต้ม</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-red-400 font-semibold mt-8 text-lg">
          ของรางวัลมีจำนวนจำกัด
        </p>
      </section>

      {/* CTA — ตรวจสอบแต้ม */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-2xl mx-auto bg-[#1a1a28]/80 backdrop-blur border border-purple-500/20 rounded-2xl p-8 text-center">
          <Image
            src="/points/checkpoint.webp"
            alt="ตรวจสอบแต้มคงเหลือ"
            width={600}
            height={300}
            className="w-full max-w-md h-auto mx-auto rounded-xl mb-6"
          />
          <h3 className="text-2xl font-bold text-white mb-4">ตรวจสอบแต้มคงเหลือ</h3>
          <p className="text-gray-300 mb-6">เช็คแต้มสะสมของคุณได้ง่ายๆ กดปุ่มด้านล่าง</p>
          <a
            href={LINE_POINTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#06C755] text-white font-semibold px-8 py-3 rounded-full hover:brightness-110 transition text-lg"
          >
            เช็คแต้มคงเหลือ
          </a>
        </div>
      </section>
    </div>
  )
}
