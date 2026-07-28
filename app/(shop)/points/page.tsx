import { Metadata } from "next"
import Image from "next/image"
import HowToCollect from "@/components/points/HowToCollect"
import LiquidGlass from "@/components/ui/LiquidGlass"
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
  { image: "/points/reward-300-chainsaw.webp", name: "เลื่อยโซ่ไร้สาย PITA 21V CT5-14", points: 300 },
  { image: "/points/reward-250-welder.webp", name: "เครื่องเชื่อม APOLLO 120A T", points: 250 },
  { image: "/points/reward-150-grinder.webp", name: "เครื่องเจียร EUROX 750W", points: 150 },
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
      {/* Background — purple "silk" gradient (pure CSS, zero filter → GPU-free).
          Replaces the 143KB jungle photo; gives the glass surfaces something
          to refract. DECISION POINT A/B — see audit; revert = restore <Image>. */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(90% 70% at 22% 16%, rgba(99,56,170,0.55) 0%, rgba(56,30,110,0.32) 38%, transparent 72%),
            radial-gradient(95% 80% at 82% 30%, rgba(150,64,190,0.4) 0%, rgba(70,30,120,0.26) 42%, transparent 76%),
            radial-gradient(120% 80% at 50% 102%, rgba(64,36,128,0.5) 0%, rgba(24,14,48,0.4) 46%, transparent 82%),
            linear-gradient(180deg, #140d28 0%, #0e0a1c 52%, #0a0710 100%)
          `,
        }}
      />

      {/* Main banner — near-square poster (1400×1273) whose "เทศกาลแลกแต้ม 2026"
          logo sits at the BOTTOM, so the fade only softens the last ~8% instead
          of the old wide banner's deep 56% fade (which would erase the logo).
          Width matches HowToCollect's max-w-3xl so the glass panel tucks in flush. */}
      <section className="relative">
        <div className="container mx-auto px-4 pt-8 md:pt-12">
          <div
            className="relative max-w-3xl mx-auto aspect-[1400/1273] overflow-hidden rounded-3xl"
            style={{
              maskImage: "linear-gradient(to bottom, #000 92%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 92%, transparent 100%)",
            }}
          >
            <Image
              src="/points/banner-2026-main.webp"
              alt="เทศกาลแลกแต้ม สามหนึ่งพานิช 2026"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* วิธีสะสม — tucks just under the banner's faded bottom edge */}
      <section className="container mx-auto px-4 -mt-8 md:-mt-10 relative z-10">
        <HowToCollect />
      </section>

      {/* รางวัล */}
      <section className="container mx-auto px-4 py-16">
        {/* nowrap spans = control the Thai line break on real phones
            (browsers break mid-word there even though DevTools doesn't) */}
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-b from-white to-purple-300 bg-clip-text text-transparent">
          <span className="whitespace-nowrap">ของใหม่สุดอลังการ</span>{" "}
          <span className="whitespace-nowrap">ให้แลกได้แล้ววันนี้</span>
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 mx-auto mt-3 mb-10 rounded-full" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {REWARDS.map((item) => (
            <div
              key={item.name}
              className="glass-card rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 group"
            >
              <div className="aspect-square relative overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="text-white font-medium leading-snug text-sm">{item.name}</h3>
                <span className="inline-flex items-center mt-3 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold text-base">
                  {item.points} แต้ม
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <span className="glass-pill inline-flex items-center gap-2 px-5 py-2 text-amber-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ของรางวัลมีจำนวนจำกัด
          </span>
        </div>
      </section>

      {/* CTA — ตรวจสอบแต้ม (LiquidGlass lens surface #2) */}
      <section className="container mx-auto px-4 pb-16">
        <LiquidGlass
          lens
          radius={24}
          bevel={15}
          strength={60}
          frost={1}
          tint="linear-gradient(180deg, rgba(58,38,104,0.46), rgba(22,15,40,0.56))"
          className="max-w-2xl mx-auto p-8 text-center"
        >
          <Image
            src="/points/checkpoint.webp"
            alt="ตรวจสอบแต้มคงเหลือ"
            width={600}
            height={300}
            className="w-full max-w-md h-auto mx-auto rounded-xl mb-6 ring-1 ring-inset ring-white/10"
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
        </LiquidGlass>
      </section>
    </div>
  )
}
