import type { NextConfig } from "next"
import pkg from "./package.json"

const pad = (n: number) => String(n).padStart(2, "0")
const now = new Date()
const buildDate = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`

const ADMIN_VERSION = "1.0.0"

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_ADMIN_VERSION: ADMIN_VERSION,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  images: {
    remotePatterns: [
      // Medusa backend images
      { protocol: "https", hostname: "*.railway.app" },
      // Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com" },
      // iTOP Plus (สำหรับรูปเดิมที่ migrate มา)
      { protocol: "https", hostname: "itp1.itopfile.com" },
      // Imgur (legacy product images)
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },
}

export default nextConfig
