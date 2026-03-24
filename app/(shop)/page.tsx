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
            <h1 className="text-white font-bold text-xl drop-shadow-lg">ร้านสามหนึ่งพานิช ลพบุรี</h1>
            <p className="text-gray-300 text-xs mt-1">สี วัสดุก่อสร้าง เครื่องมือช่าง ศูนย์ผสมสี จ.ลพบุรี</p>
            <div className="mt-3">
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-block border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-xs font-medium px-4 py-2 rounded-full transition">โทรสั่งเลย</a>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Banner — Desktop + CTA overlay */}
      <section className="hidden lg:block w-full relative">
        <Image
          src="/site2026_R_space.webp"
          alt="ร้านสามหนึ่งพานิช ศูนย์รับผสมสี วัสดุก่อสร้าง ประปา"
          width={1920}
          height={600}
          className="w-full h-auto"
          priority
        />
        {/* Left overlay — ชื่อร้าน + CTA */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-[#0a0a0f]/30 to-transparent flex items-center pl-[10%]">
          <div>
            <h1 className="text-white font-bold text-4xl drop-shadow-lg">ร้านสามหนึ่งพานิช ลพบุรี</h1>
            <p className="text-gray-300 text-base mt-2">สี วัสดุก่อสร้าง เครื่องมือช่าง ศูนย์ผสมสี จ.ลพบุรี</p>
            <div className="mt-5">
              <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-block border border-white/30 hover:border-cyan-400 hover:text-cyan-400 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">โทรสั่งเลย</a>
            </div>
          </div>
        </div>
        {/* Right overlay — จุดเด่นร้าน */}
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 -translate-x-10 text-center select-none pointer-events-none">
          <p className="text-[#f5d000] font-semibold text-2xl xl:text-3xl drop-shadow-lg">ศูนย์รับผสมสีทาบ้าน</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="bg-[#f5d000] text-[#1a1a1a] font-bold text-base xl:text-lg px-4 py-1 rounded-md shadow-lg">Beger</span>
            <span className="bg-[#f5d000] text-[#1a1a1a] font-bold text-base xl:text-lg px-4 py-1 rounded-md shadow-lg">TOA</span>
          </div>
          <p className="text-white font-light text-xl xl:text-2xl mt-3 tracking-wide drop-shadow-lg">ก่อสร้าง-ซ่อมแซม</p>
          <p className="text-white font-light text-xl xl:text-2xl tracking-wide drop-shadow-lg">ไฟฟ้า/ประปา/สว่าน/ปั๊มน้ำ</p>
          <p className="mt-3 font-bold text-2xl xl:text-3xl px-8 py-1.5 rounded-lg text-[#3a1366] inline-block" style={{ background: "linear-gradient(to right, transparent, #22d3ee 20%, #7dd3fc 80%, transparent)" }}>ราคาไม่แพง!</p>
        </div>
      </section>

      {/* Google Review Strip — ใต้ banner */}
      <GoogleReviewStrip />

      {/* คูปองพิเศษ — ต่อจาก review strip */}
      <PromotionCouponsStrip />

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
    </>
  )
}
