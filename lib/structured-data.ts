// JSON-LD Structured Data สำหรับ SEO + AI crawlers
import { PHONE, EMAIL, GEO, HOURS_OPEN, HOURS_CLOSE, FB_URL, LINE_URL, GOOGLE_MAPS_URL } from "./store-config"
import REVIEWS from "@/data/reviews.json"

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HardwareStore",
  name: "ร้านสามหนึ่งพานิช",
  alternateName: ["31panich", "ร้านสามหนึ่ง", "31 พานิช", "Sam Nueng Panich"],
  description: "ร้านวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา ศูนย์รับผสมสี ครบวงจร จ.ลพบุรี เปิดมากว่า 20 ปี",
  url: "https://31panich.co.th",
  telephone: PHONE,
  email: EMAIL,
  image: "https://31panich.co.th/front-store.webp",
  logo: "https://31panich.co.th/logo.webp",
  priceRange: "฿",
  currenciesAccepted: "THB",
  paymentAccepted: "Cash, Bank Transfer, PromptPay",
  address: {
    "@type": "PostalAddress",
    streetAddress: "99/1 หมู่ 7 ถนนพหลโยธิน",
    addressLocality: "ต.เขาพระงาม อ.เมือง",
    addressRegion: "ลพบุรี",
    postalCode: "15160",
    addressCountry: "TH",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: GEO.lat,
    longitude: GEO.lng,
  },
  hasMap: GOOGLE_MAPS_URL,
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    opens: HOURS_OPEN,
    closes: HOURS_CLOSE,
  },
  areaServed: [
    { "@type": "City", name: "ลพบุรี", sameAs: "https://en.wikipedia.org/wiki/Lop_Buri" },
    { "@type": "State", name: "จังหวัดลพบุรี" },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    bestRating: "5",
    ratingCount: "120",
    reviewCount: String(REVIEWS.length),
  },
  review: REVIEWS.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.name },
    reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
    reviewBody: r.text,
  })),
  sameAs: [FB_URL, LINE_URL, GOOGLE_MAPS_URL],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "สินค้าร้านสามหนึ่งพานิช",
    itemListElement: [
      { "@type": "OfferCatalog", name: "วัสดุก่อสร้าง" },
      { "@type": "OfferCatalog", name: "เครื่องมือช่าง" },
      { "@type": "OfferCatalog", name: "สีทาบ้าน — ศูนย์ผสมสี Beger TOA" },
      { "@type": "OfferCatalog", name: "อุปกรณ์ไฟฟ้า" },
      { "@type": "OfferCatalog", name: "อุปกรณ์ประปา" },
    ],
  },
}

/** FAQ Schema — Google แสดง FAQ rich snippet */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

const BASE = "https://31panich.co.th"

/** BreadcrumbList JSON-LD — Google แสดง breadcrumb ใน search results */
export function breadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url.startsWith("/") ? `${BASE}${item.url}` : item.url } : {}),
    })),
  }
}

export function productSchema(product: {
  title: string
  description?: string
  images?: { url: string }[]
  variants?: { prices?: { amount: number; currency_code: string }[] }[]
  handle: string
}) {
  const price = product.variants?.[0]?.prices?.[0]
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images?.[0]?.url,
    url: `https://31panich.co.th/products/${product.handle}`,
    offers: price
      ? {
          "@type": "Offer",
          priceCurrency: price.currency_code.toUpperCase(),
          price: (price.amount / 100).toFixed(2),
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "ร้านสามหนึ่งพานิช" },
        }
      : undefined,
  }
}
