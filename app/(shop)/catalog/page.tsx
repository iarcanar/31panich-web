import { Metadata } from "next"
import Image from "next/image"
import CatalogSection from "@/components/home/CatalogSection"
import SectionHeader from "@/components/home/SectionHeader"
import { breadcrumbSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "แคตตาล็อก",
  description: "แคตตาล็อกสินค้า EMTOP Dongcheng(DC) iNGCO Beger ATM Spray เครื่องมือช่าง สีทาบ้าน สีสเปรย์ ร้านสามหนึ่งพานิช ลพบุรี",
  openGraph: {
    title: "แคตตาล็อกสินค้า สามหนึ่งพานิช",
    description: "แคตตาล็อกเครื่องมือช่าง สี วัสดุก่อสร้าง EMTOP Dongcheng iNGCO Beger",
    images: [{ url: "/bg-catalog.webp", width: 1920, height: 823, alt: "แคตตาล็อกสินค้า สามหนึ่งพานิช" }],
  },
}

const breadcrumb = breadcrumbSchema([
  { name: "หน้าแรก", url: "/" },
  { name: "แคตตาล็อก" },
])

export default function CatalogPage() {
  return (
    <div className="bg-[#0e0e14] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Hero Banner */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/bg-catalog.webp"
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
            title="แคตตาล็อกสินค้า"
            subtitle="ดาวน์โหลดแคตตาล็อกจากแบรนด์ชั้นนำที่เราจำหน่าย"
            theme="cyan"
            subtle
          />
        </div>
      </section>
      <CatalogSection />
    </div>
  )
}
