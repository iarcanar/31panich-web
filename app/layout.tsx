import type { Metadata, Viewport } from "next"
import { Noto_Sans_Thai, Noto_Sans } from "next/font/google"
import "./globals.css"

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  weight: ["400", "500", "600", "700"],
})

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
  weight: ["400", "500", "600", "700"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://31panich.co.th"),
  title: {
    default: "ร้านสามหนึ่งพานิช | วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี",
    template: "%s | สามหนึ่งพานิช",
  },
  description:
    "ร้านวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา ครบวงจร จ.ลพบุรี ศูนย์รับผสมสี Beger TOA ตัวแทน Makita Dongcheng(DC) iNGCO EMTOP",
  keywords: [
    "วัสดุก่อสร้าง", "เครื่องมือช่าง", "ลพบุรี", "สีทาบ้าน", "ร้านวัสดุก่อสร้างลพบุรี",
    "Beger", "TOA", "สามหนึ่งพานิช", "31panich", "ร้านสามหนึ่ง",
    "ศูนย์ผสมสี", "Makita", "สว่าน", "เครื่องเจียร", "รับผสมสี",
    "อุปกรณ์ช่าง", "ซ่อมบ้าน", "ประปา", "ไฟฟ้า", "ร้านเครื่องมือช่างลพบุรี",
  ],
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ร้านสามหนึ่งพานิช",
    images: [{ url: "/banner.webp", width: 1200, height: 600, alt: "ร้านสามหนึ่งพานิช วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ร้านสามหนึ่งพานิช | วัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี",
    description: "ร้านวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา ครบวงจร จ.ลพบุรี",
    images: ["/banner.webp"],
  },
  verification: {
    google: "kWYaFy2-JaEjGsKFb4FL8FGqFczYZRLDvrKYdaPVC04",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${notoSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://i.imgur.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
