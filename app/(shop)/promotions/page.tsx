import { Metadata } from "next"
import Image from "next/image"
import PromoGrid from "@/components/home/PromoGrid"
import { getActivePromotions } from "@/lib/promotions"
import ContactLink from "@/components/ui/ContactLink"
import { getActiveCoupons, getUpcomingCoupons } from "@/lib/coupons"
import CouponGrid from "@/components/coupon/CouponGrid"
import { breadcrumbSchema } from "@/lib/structured-data"

export const revalidate = 300 // ISR: revalidate ทุก 5 นาที

export const metadata: Metadata = {
  title: "โปรโมชั่น",
  description: "โปรโมชั่นลดราคาสินค้า วัสดุก่อสร้าง เครื่องมือช่าง ร้านสามหนึ่งพานิช ลพบุรี",
  openGraph: {
    title: "โปรโมชั่น สามหนึ่งพานิช",
    description: "โปรโมชั่นลดราคา วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี",
    images: [{ url: "/bg-promotion.webp", width: 1920, height: 800, alt: "โปรโมชั่นร้านสามหนึ่งพานิช" }],
  },
}

const breadcrumb = breadcrumbSchema([
  { name: "หน้าแรก", url: "/" },
  { name: "โปรโมชั่น" },
])

export default async function PromotionsPage() {
  const promotions = getActivePromotions()
  const [coupons, upcoming] = await Promise.all([getActiveCoupons(), getUpcomingCoupons()])

  return (
    <div className="bg-[#0e0e14] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Hero Banner */}
      <section className="relative overflow-hidden -mt-16 lg:mt-0">
        <Image
          src="/bg-promotion.webp"
          alt=""
          width={1920}
          height={823}
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14]/60 via-[#0e0e14]/40 to-[#0e0e14]" />
        <div className="relative container mx-auto px-4 pt-28 pb-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">โปรโมชั่น</h1>
          <p className="text-gray-300">โปรโมชั่นและข้อเสนอพิเศษจากร้านสามหนึ่งพานิช</p>
        </div>
      </section>

      {/* Current Promotion */}
      <PromoGrid promotions={promotions} />

      {/* Coupons Section */}
      {(coupons.length > 0 || upcoming.length > 0) && (
        <section className="container mx-auto px-4 py-10 md:py-14">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">🎟️ คูปองพิเศษ</h2>
          <p className="text-sm text-white/50 mb-6">รับคูปองส่วนลดได้เฉพาะบนเว็บไซต์เท่านั้น — กดรับแล้วนำไปแสดงที่ร้าน</p>
          <CouponGrid coupons={coupons} upcoming={upcoming} />
        </section>
      )}

      {/* Empty state / LINE CTA */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-[#1a1a28] border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400 mb-4">
            {coupons.length === 0
              ? "โปรโมชั่นเพิ่มเติม กำลังจะมาเร็วๆ นี้"
              : "ติดตามคูปองและโปรโมชั่นใหม่ๆ ผ่าน LINE"}
          </p>
          <ContactLink
            type="line"
            className="inline-flex items-center gap-2 bg-[#06C755] text-white font-semibold px-6 py-3 rounded-full hover:brightness-110 transition text-sm"
          >
            💬 ติดตามโปรโมชั่นผ่าน LINE
          </ContactLink>
        </div>
      </section>
    </div>
  )
}
