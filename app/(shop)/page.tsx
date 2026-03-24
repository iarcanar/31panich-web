export const dynamic = "force-dynamic"

import Image from "next/image"
import Link from "next/link"
import BestsellerSection from "@/components/home/BestsellerSection"
import NewProductsSection from "@/components/home/NewProductsSection"
import CategorySlideshowSection from "@/components/home/CategorySlideshowSection"
import RewardsCarousel from "@/components/home/RewardsCarousel"
import FeaturedProductBanner from "@/components/home/FeaturedProductBanner"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import PromotionCouponsStrip from "@/components/home/PromotionCouponsStrip"
import { localBusinessSchema } from "@/lib/structured-data"
import { PHONE } from "@/lib/store-config"

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Hero Banner — Mobile: full-bleed behind header + CTA overlay */}
      <section className="lg:hidden -mt-14 relative w-full aspect-[5/2]">
        <Image
          src="/banner-mobile.webp"
          alt="ร้านสามหนึ่งพานิช วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent flex items-end pb-5 px-5">
          <div>
            <p className="text-white font-bold text-lg drop-shadow-lg">วัสดุก่อสร้าง เครื่องมือช่าง</p>
            <p className="text-gray-300 text-xs mt-1">ราคาช่าง ส่งถึงหน้างาน</p>
            <div className="flex gap-2.5 mt-3">
              <Link href="/products" className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-4 py-2 rounded-full transition">ดูสินค้า</Link>
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-xs font-medium px-4 py-2 rounded-full transition">โทรสั่งเลย</a>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Banner — Desktop + CTA overlay */}
      <section className="hidden lg:block w-full relative">
        <Image
          src="/banner.webp"
          alt="ร้านสามหนึ่งพานิช ศูนย์รับผสมสี วัสดุก่อสร้าง ประปา"
          width={1920}
          height={600}
          className="w-full h-auto"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-[#0a0a0f]/30 to-transparent flex items-center pl-[10%]">
          <div>
            <p className="text-white font-bold text-3xl drop-shadow-lg">วัสดุก่อสร้าง เครื่องมือช่าง</p>
            <p className="text-gray-300 text-sm mt-2">ราคาช่าง จัดส่งถึงหน้างาน จ.ลพบุรี</p>
            <div className="flex gap-3 mt-5">
              <Link href="/products" className="bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold px-6 py-2.5 rounded-full transition">ดูสินค้า</Link>
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">โทรสั่งเลย</a>
            </div>
          </div>
        </div>
      </section>

      {/* สินค้าขายดี — ย้ายขึ้นมาให้เห็นก่อน */}
      <BestsellerSection />

      {/* สินค้าใหม่ */}
      <NewProductsSection />

      {/* สไลด์โชว์ประเภทสินค้า */}
      <CategorySlideshowSection />

      {/* โปรโมชั่นล่าสุด */}
      <FeaturedProductBanner />

      {/* คูปองพิเศษ */}
      <PromotionCouponsStrip />

      {/* แลกแต้ม 31 POINTS */}
      <RewardsCarousel />

      {/* Google Review Strip — social proof ก่อน footer */}
      <GoogleReviewStrip />
    </>
  )
}
