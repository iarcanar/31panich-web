// JSON-LD Structured Data สำหรับ SEO + AI crawlers
import { PHONE, EMAIL, GEO, HOURS_OPEN, HOURS_CLOSE, FB_URL, LINE_URL } from "./store-config"

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HardwareStore",
  name: "ร้านสามหนึ่งพานิช",
  alternateName: "31panich",
  description: "ร้านวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้าประปา ครบวงจร จ.ลพบุรี",
  url: "https://31panich.co.th",
  telephone: PHONE,
  email: EMAIL,
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
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    opens: HOURS_OPEN,
    closes: HOURS_CLOSE,
  },
  sameAs: [FB_URL, LINE_URL],
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
