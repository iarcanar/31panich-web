"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Product } from "@/lib/products"
import ContactLink from "@/components/ui/ContactLink"

interface CatalogInfo {
  id: string
  brand: string
  url: string
}

interface Props {
  product: Product & { images?: string[] }
  categoryLabel: string
  relatedProducts: Product[]
  catalog?: CatalogInfo | null
}

export default function ProductDetailView({ product, categoryLabel, relatedProducts, catalog }: Props) {
  const router = useRouter()
  const allImages = product.images?.length ? product.images : [product.image]
  const [selectedImg, setSelectedImg] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)

  // Smart back: use browser history if there's something to go back to,
  // otherwise fall back to the category page (e.g. user landed via deep
  // link, share, or search engine).
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/products/${product.category}`)
    }
  }

  const hasVariants = product.variants && product.variants.length > 0
  const activeVariant = selectedVariant !== null ? product.variants?.[selectedVariant] : null

  const variantPrices = hasVariants ? product.variants!.map((v) => v.price) : []
  const minPrice = hasVariants ? Math.min(...variantPrices) : product.price
  const maxPrice = hasVariants ? Math.max(...variantPrices) : product.price
  const displayPrice = activeVariant ? activeVariant.price : minPrice
  const displayStock = hasVariants
    ? activeVariant ? activeVariant.stock : null
    : product.stock

  const hasDiscount = product.originalPrice && product.originalPrice > displayPrice
  const discountPercent = hasDiscount
    ? Math.round((1 - displayPrice / product.originalPrice!) * 100)
    : 0

  // Image badge: use selected variant's discount, or best among variants, or product-level
  const imgDiscountPct = activeVariant
    ? (activeVariant.originalPrice && activeVariant.originalPrice > activeVariant.price
      ? Math.round((1 - activeVariant.price / activeVariant.originalPrice) * 100) : 0)
    : hasVariants
      ? Math.max(0, ...product.variants!.map((v) => v.originalPrice && v.originalPrice > v.price ? Math.round((1 - v.price / v.originalPrice) * 100) : 0))
      : discountPercent

  // Parse description into lines for bullet display
  const descLines = product.description?.split("\n").filter(Boolean) ?? []
  const mainDesc = descLines[0] ?? ""
  const specs = descLines.slice(1)

  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* Breadcrumb ribbon — back, home, category, product all unified */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-stretch gap-0 text-xs md:text-sm -ml-4 -mr-4">
          <button
            onClick={handleBack}
            aria-label="ย้อนกลับ"
            type="button"
            className="crumb-chip crumb-chip-back"
          >
            <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="ml-1 hidden md:inline">ย้อนกลับ</span>
          </button>
          <Link href="/" className="crumb-chip">หน้าแรก</Link>
          <Link href={`/products/${product.category}`} className="crumb-chip">
            {categoryLabel}
          </Link>
          <span className="crumb-chip crumb-chip-active crumb-chip-dissolve-right flex-1 min-w-0">
            <span className="line-clamp-2 th-text">{product.name}</span>
          </span>
        </nav>
      </div>

      {/* Main Content */}
      <section className="container mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="lg:w-1/2">
            {/* Main image */}
            <div className="aspect-square bg-[#1a1a28] rounded-2xl border border-white/10 relative overflow-hidden">
              <Image
                src={allImages[selectedImg]}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              {imgDiscountPct > 0 && (
                <div className={`absolute top-4 left-4 text-white text-sm font-bold px-3 py-1 rounded-lg ${imgDiscountPct >= 20 ? "bg-red-500" : "bg-orange-500"}`}>
                  -{imgDiscountPct}%
                </div>
              )}
              {product.isNew && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                  NEW
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 mt-4">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`w-20 h-20 relative rounded-xl overflow-hidden border-2 transition-all ${
                      i === selectedImg
                        ? "border-cyan-400 shadow-lg shadow-cyan-500/20"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:w-1/2">
            {/* Brand & Category */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-cyan-400 text-sm font-semibold">{product.brand}</span>
              <span className="text-gray-600">|</span>
              <Link
                href={`/products/${product.category}`}
                className="text-gray-400 text-sm hover:text-white transition"
              >
                {categoryLabel}
              </Link>
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="mt-2 text-sm text-gray-500">
              SKU: {product.sku}
            </p>

            {/* Variants selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-400 mb-2.5">ตัวเลือก</h3>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v, i) => {
                    const vPct = v.originalPrice && v.originalPrice > v.price
                      ? Math.round((1 - v.price / v.originalPrice) * 100) : 0
                    return (
                    <button
                      key={i}
                      onClick={() => setSelectedVariant(selectedVariant === i ? null : i)}
                      className={`px-4 py-2.5 rounded-xl text-left border transition-all duration-200 min-w-[140px] ${
                        v.stock <= 0
                          ? "opacity-50 border-white/5 text-gray-500"
                          : selectedVariant === i
                            ? "bg-cyan-500/15 border-cyan-400/60 text-white shadow-lg shadow-cyan-500/10"
                            : "bg-[#1a1a28] border-white/10 text-gray-300 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{v.label}</span>
                        <span className="text-amber-400 font-bold">{v.price.toLocaleString()}.-</span>
                      </div>
                      {vPct > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-gray-500 text-xs line-through">฿{v.originalPrice!.toLocaleString()}</span>
                          <span className={`text-[10px] font-bold px-1 rounded ${vPct >= 20 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>-{vPct}%</span>
                        </div>
                      )}
                      {v.stock <= 0 && <p className="text-red-400 text-[11px] mt-0.5">สินค้าหมด</p>}
                    </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="mt-6 flex items-baseline gap-4">
              {hasVariants && !activeVariant ? (
                <p className="text-3xl md:text-4xl font-black text-amber-400">
                  {minPrice === maxPrice
                    ? `฿${minPrice.toLocaleString()}`
                    : `฿${minPrice.toLocaleString()} — ฿${maxPrice.toLocaleString()}`}
                </p>
              ) : (
                <>
                  <p className="text-3xl md:text-4xl font-black text-amber-400">
                    ฿{displayPrice.toLocaleString()}
                  </p>
                  {hasDiscount && (
                    <p className="text-lg text-gray-500 line-through">
                      ฿{product.originalPrice!.toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>
            {hasDiscount && activeVariant && (
              <p className="mt-1 text-sm text-red-400 font-medium">
                ประหยัด ฿{(product.originalPrice! - displayPrice).toLocaleString()}
              </p>
            )}

            {/* Stock status */}
            <div className="mt-4 flex items-center gap-2">
              {displayStock === null ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">กรุณาเลือกตัวเลือกสินค้า</span>
                </>
              ) : displayStock > 0 ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-sm font-medium">
                    มีสินค้า ({displayStock} ชิ้น)
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-red-400 text-sm font-medium">สินค้าหมด</span>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-6" />

            {/* Description */}
            {mainDesc && (
              <p className="text-gray-300 leading-relaxed">{mainDesc}</p>
            )}

            {/* Specs */}
            {specs.length > 0 && (
              <div className="mt-5 space-y-1.5">
                {specs.map((line, i) => {
                  const headingMatch = line.match(/^【(.+?)】$/)
                  if (headingMatch) {
                    return (
                      <h3 key={i} className="text-white font-semibold text-sm mt-4 mb-1 first:mt-0">
                        {headingMatch[1]}
                      </h3>
                    )
                  }
                  const cleaned = line.replace(/^[✦•·\-–]\s*/, "")
                  return (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{cleaned}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <ContactLink
                type="line"
                className="flex items-center justify-center gap-2 bg-[#06C755] text-white font-bold px-8 py-3.5 rounded-xl text-center hover:bg-[#05b34d] transition-colors shadow-lg shadow-green-500/20"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                สั่งซื้อผ่าน LINE
              </ContactLink>
              <ContactLink
                type="phone"
                className="flex items-center justify-center gap-2 bg-[#1a1a28] text-white font-bold px-8 py-3.5 rounded-xl text-center border border-white/10 hover:border-cyan-400/30 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                โทรสอบถาม
              </ContactLink>
            </div>
            {catalog && (
              <a
                href={catalog.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                ดูแคตตาล็อก {catalog.brand}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-white/5 py-10 md:py-14">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-white mb-6">สินค้าในหมวดเดียวกัน</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.category}/${encodeURIComponent(item.slug)}`}
                  className="bg-[#1a1a28] rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-400/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 group"
                >
                  <div className="aspect-[4/3] bg-[#1e2035] relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white line-clamp-2">{item.name}</h3>
                    <p className="text-amber-400 font-bold mt-1">฿{item.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
