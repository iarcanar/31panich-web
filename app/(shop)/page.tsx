export const dynamic = "force-dynamic"

import Image from "next/image"
import BestsellerSection from "@/components/home/BestsellerSection"
import NewProductsSection from "@/components/home/NewProductsSection"
import CategorySlideshowSection from "@/components/home/CategorySlideshowSection"
import RewardsCarousel from "@/components/home/RewardsCarousel"
import PromoGrid from "@/components/home/PromoGrid"
import { getActivePromotions } from "@/lib/promotions"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import PromotionCouponsStrip from "@/components/home/PromotionCouponsStrip"
import { localBusinessSchema } from "@/lib/structured-data"
import { PHONE } from "@/lib/store-config"

export default function HomePage() {
  const promotions = getActivePromotions()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Hero Banner — Mobile: full-bleed behind header + CTA overlay */}
      <section className="lg:hidden -mt-16 relative w-full aspect-[2/1]">
        <Image
          src="/banner-mobile.webp"
          alt="ร้านสามหนึ่งพานิช วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent flex items-end justify-center pb-5 px-5 pt-16">
          <div className="text-center">
            <p className="text-white font-bold text-xl drop-shadow-lg">สามหนึ่งพานิช</p>
            <p className="text-gray-300 text-xs mt-1">สี วัสดุก่อสร้าง เครื่องมือช่าง จ.ลพบุรี</p>
            <div className="mt-3">
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-block border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-xs font-medium px-4 py-2 rounded-full transition">โทรสั่งเลย</a>
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
            <p className="text-white font-bold text-4xl drop-shadow-lg">สามหนึ่งพานิช</p>
            <p className="text-gray-300 text-base mt-2">สี วัสดุก่อสร้าง เครื่องมือช่าง จ.ลพบุรี</p>
            <div className="mt-5">
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-block border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">โทรสั่งเลย</a>
            </div>
          </div>
        </div>
      </section>

      {/* Google Review Strip — ใต้ banner */}
      <GoogleReviewStrip />

      {/* สินค้าขายดี */}
      <BestsellerSection />

      <div className="border-t border-white/5" />

      {/* สินค้าใหม่ */}
      <NewProductsSection />

      <div className="border-t border-white/5" />

      {/* สไลด์โชว์ประเภทสินค้า */}
      <CategorySlideshowSection />

      <div className="border-t border-white/5" />

      {/* โปรโมชั่นล่าสุด */}
      <PromoGrid promotions={promotions} />

      <div className="border-t border-white/5" />

      {/* คูปองพิเศษ */}
      <PromotionCouponsStrip />

      <div className="border-t border-white/5" />

      {/* แลกแต้ม 31 POINTS */}
      <RewardsCarousel />
    </>
  )
}
