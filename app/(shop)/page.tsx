export const dynamic = "force-dynamic"

import Image from "next/image"
import BestsellerSection from "@/components/home/BestsellerSection"
import NewProductsSection from "@/components/home/NewProductsSection"
import CategorySlideshowSection from "@/components/home/CategorySlideshowSection"
import RewardsCarousel from "@/components/home/RewardsCarousel"
import FeaturedProductBanner from "@/components/home/FeaturedProductBanner"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import PromotionCouponsStrip from "@/components/home/PromotionCouponsStrip"
import { localBusinessSchema } from "@/lib/structured-data"

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Hero Banner — Mobile: CI 2026 full-bleed behind header */}
      <section className="lg:hidden -mt-14 relative w-full aspect-[5/2]">
        <Image
          src="/banner-mobile.webp"
          alt="ร้านสามหนึ่งพานิช วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </section>

      {/* Hero Banner — Desktop */}
      <section className="hidden lg:block w-full">
        <Image
          src="/banner.webp"
          alt="ร้านสามหนึ่งพานิช ศูนย์รับผสมสี วัสดุก่อสร้าง ประปา"
          width={1920}
          height={600}
          className="w-full h-auto"
          priority
        />
      </section>

      {/* Google Review Strip */}
      <GoogleReviewStrip />

      {/* คูปองพิเศษ */}
      <PromotionCouponsStrip />

      {/* โปรโมชั่นล่าสุด */}
      <FeaturedProductBanner />

      {/* สินค้าใหม่ */}
      <NewProductsSection />

      {/* สไลด์โชว์ประเภทสินค้า */}
      <CategorySlideshowSection />

      {/* แลกแต้ม 31 POINTS */}
      <RewardsCarousel />

      {/* สินค้าขายดี */}
      <BestsellerSection />
    </>
  )
}
