import { Metadata } from "next"
import Image from "next/image"
import CatalogSection from "@/components/home/CatalogSection"

export const metadata: Metadata = {
  title: "แคตตาล็อก",
  description: "แคตตาล็อกสินค้า EMTOP Dongcheng(DC) iNGCO Beger ATM Spray เครื่องมือช่าง สีทาบ้าน สีสเปรย์ ร้านสามหนึ่งพานิช ลพบุรี",
}

export default function CatalogPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/bg-catalog.webp"
          alt=""
          width={1920}
          height={823}
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14]/60 via-[#0e0e14]/40 to-[#0e0e14]" />
        <div className="relative container mx-auto px-4 pt-28 pb-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">แคตตาล็อกสินค้า</h1>
          <p className="text-gray-300">ดาวน์โหลดแคตตาล็อกจากแบรนด์ชั้นนำที่เราจำหน่าย</p>
        </div>
      </section>
      <CatalogSection />
    </div>
  )
}
