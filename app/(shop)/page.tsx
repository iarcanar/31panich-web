export const revalidate = 3600 // ISR: revalidate ทุก 1 ชั่วโมง (ลด function invokes 92%)

import BestsellerSection from "@/components/home/BestsellerSection"
import NewProductsSection from "@/components/home/NewProductsSection"
import CategorySlideshowSection from "@/components/home/CategorySlideshowSection"
import RewardsCarousel from "@/components/home/RewardsCarousel"
import PromoGrid from "@/components/home/PromoGrid"
import { getActivePromotions } from "@/lib/promotions"
import GoogleReviewStrip from "@/components/home/GoogleReviewStrip"
import CouponsReelsRow from "@/components/home/CouponsReelsRow"
import HomeHero from "@/components/home/HomeHero"
import ThaiChuayThaiBanner from "@/components/home/ThaiChuayThaiBanner"
import DiscoverFeed from "@/components/home/DiscoverFeed"
import { localBusinessSchema } from "@/lib/structured-data"

export default function HomePage() {
  const promotions = getActivePromotions()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* Hero — ภาพหน้าร้านจริง + คนต้อนรับ (แทน sci-fi banner เดิม; รวมโซน "ยินดีต้อนรับ" เข้าด้วยกันไม่ให้ซ้ำ) */}
      <HomeHero />

      {/* แบนเนอร์โครงการรัฐ "ไทยช่วยไทย พลัส (60/40)" — กดเพื่อ expand วิธีคิด + คำนวณสิทธิ์ */}
      <ThaiChuayThaiBanner />

      {/* Google Review Strip — ใต้ banner */}
      <GoogleReviewStrip />

      {/* คูปอง + Facebook Reels — แบ่งโซน 50:50 บน desktop */}
      <CouponsReelsRow />

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

      {/* แลกแต้ม 31 POINTS */}
      <RewardsCarousel />

      <div className="border-t border-white/5" />

      {/* เลือกดูสินค้าเพิ่มเติม — feed ท้ายหน้า "เลื่อนดูเพลินๆ ไม่รู้จบ" */}
      <DiscoverFeed />
    </>
  )
}
