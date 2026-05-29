"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useRef, useEffect, Fragment } from "react"
import ContactLink from "@/components/ui/ContactLink"
import type { Product } from "@/lib/products"

interface RecommendedProduct {
  id: string
  name: string
  slug: string
  price: number
  category: string
  categoryLabel: string
  image: string
}

interface Props {
  products: Product[]
  categoryLabel: string
  categoryValue: string
  recommended: RecommendedProduct[]
}

export default function CategoryProductGrid({ products, categoryLabel, categoryValue, recommended }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedImg, setSelectedImg] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedImg(0)
    setSelectedVariant(null)
  }, [expandedId])

  useEffect(() => {
    if (expandedId && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 150)
    }
  }, [expandedId])

  function handleCardClick(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-[#2a2a3a] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-gray-400 mb-1">ยังไม่มีสินค้าในหมวด{categoryLabel}</p>
        <p className="text-gray-500 text-sm mb-6">กำลังเพิ่มสินค้าเร็วๆ นี้ — สอบถามสินค้าได้ทาง LINE</p>
        <div className="flex items-center justify-center gap-3">
          <ContactLink
            type="line"
            className="inline-flex items-center gap-2 bg-[#06C755] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#05b34d] transition-colors shadow-lg shadow-green-500/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            สอบถามสินค้า
          </ContactLink>
          <Link href="/products" className="text-cyan-400/70 hover:text-cyan-300 text-sm transition-colors">
            ดูหมวดอื่น &rarr;
          </Link>
        </div>

        {/* Show recommended products even when this category is empty */}
        {recommended.length > 0 && (
          <div className="mt-12 text-left">
            <h2 className="text-lg font-bold text-white mb-1">สินค้าหมวดอื่นที่น่าสนใจ</h2>
            <p className="text-gray-500 text-sm mb-5">เลือกดูสินค้าจากหมวดหมู่อื่นๆ</p>
            <div className="relative">
              <div
                className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {recommended.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.category}/${encodeURIComponent(item.slug)}`}
                    className="flex-shrink-0 w-32 md:w-36 snap-start bg-[#1a1a28] rounded-xl border border-white/10 overflow-hidden hover:border-cyan-400/20 hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div className="aspect-square bg-[#1e2035] relative overflow-hidden">
                      <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="144px" />
                    </div>
                    <div className="p-2 md:p-2.5">
                      <span className="text-[10px] text-cyan-400">{item.categoryLabel}</span>
                      <h3 className="text-[11px] md:text-xs font-medium text-white mt-0.5 line-clamp-2 leading-snug">{item.name}</h3>
                      <p className="text-amber-400 text-xs font-bold mt-1">฿{item.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent pointer-events-none md:hidden" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══ Product Grid ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => {
          const isExpanded = expandedId === p.id
          const discountPct = p.originalPrice && p.originalPrice > p.price
            ? Math.round((1 - p.price / p.originalPrice) * 100)
            : 0

          return (
            <Fragment key={p.id}>
              {/* ─── Product Card ─── */}
              <div
                onClick={() => handleCardClick(p.id)}
                className={`cursor-pointer bg-[#1a1a28] rounded-2xl border overflow-hidden transition-all duration-300 group ${
                  isExpanded
                    ? "border-cyan-400/40 shadow-lg shadow-cyan-500/10 scale-[0.97]"
                    : "border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/5 active:scale-[0.97]"
                }`}
              >
                <div className="aspect-[4/3] bg-[#1e2035] relative overflow-hidden">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">รูปสินค้า</span>
                    </div>
                  )}
                  {discountPct > 0 && (
                    <div className={`absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-md ${discountPct >= 20 ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}>
                      -{discountPct}%
                    </div>
                  )}
                  {p.isNew && (
                    <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-md bg-emerald-500 text-white">
                      NEW
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4">
                  {p.brand && <span className="text-[11px] md:text-xs text-cyan-400 font-medium">{p.brand}</span>}
                  <h3 className="text-xs md:text-sm font-semibold text-white mt-0.5 md:mt-1 leading-snug line-clamp-2">{p.name}</h3>
                  <div className="flex items-baseline gap-2 mt-1.5 md:mt-2">
                    <p className="text-amber-400 font-bold text-sm md:text-base">฿{p.price.toLocaleString()}</p>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <p className="text-gray-500 text-[11px] line-through">฿{p.originalPrice.toLocaleString()}</p>
                    )}
                  </div>
                  {p.stock <= 0 && <p className="text-red-400 text-[11px] mt-1">สินค้าหมด</p>}
                </div>
              </div>

              {/* ─── Expanded Detail ─── */}
              {isExpanded && (
                <ExpandedDetail
                  ref={detailRef}
                  product={p}
                  categoryLabel={categoryLabel}
                  categoryValue={categoryValue}
                  selectedImg={selectedImg}
                  setSelectedImg={setSelectedImg}
                  selectedVariant={selectedVariant}
                  setSelectedVariant={setSelectedVariant}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* ═══ Recommended Products from Other Categories ═══ */}
      {recommended.length > 0 && (
        <div className="mt-14 md:mt-20">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1">สินค้าหมวดอื่นที่น่าสนใจ</h2>
          <p className="text-gray-500 text-sm mb-5">เลือกดูสินค้าเพิ่มเติมจากหมวดหมู่อื่นๆ</p>
          <div className="relative">
            <div
              className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {recommended.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.category}/${encodeURIComponent(item.slug)}`}
                  className="flex-shrink-0 w-32 md:w-36 snap-start bg-[#1a1a28] rounded-xl border border-white/10 overflow-hidden hover:border-cyan-400/20 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="aspect-square bg-[#1e2035] relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="144px"
                    />
                  </div>
                  <div className="p-2 md:p-2.5">
                    <span className="text-[10px] text-cyan-400">{item.categoryLabel}</span>
                    <h3 className="text-[11px] md:text-xs font-medium text-white mt-0.5 line-clamp-2 leading-snug">{item.name}</h3>
                    <p className="text-amber-400 text-xs font-bold mt-1">฿{item.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
            {/* Mobile scroll hint fade */}
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent pointer-events-none md:hidden" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Expanded Product Detail — full-width card inside the grid
   ═══════════════════════════════════════════════════════════ */

import { forwardRef } from "react"

interface ExpandedDetailProps {
  product: Product
  categoryLabel: string
  categoryValue: string
  selectedImg: number
  setSelectedImg: (i: number) => void
  selectedVariant: number | null
  setSelectedVariant: (i: number | null) => void
  onClose: () => void
}

const ExpandedDetail = forwardRef<HTMLDivElement, ExpandedDetailProps>(function ExpandedDetail(
  { product, categoryLabel, categoryValue, selectedImg, setSelectedImg, selectedVariant, setSelectedVariant, onClose },
  ref
) {
  const p = product
  const allImages = p.images?.length ? p.images : p.image ? [p.image] : []
  const hasVariants = p.variants && p.variants.length > 0
  const activeVariant = selectedVariant !== null ? p.variants?.[selectedVariant] : null

  const variantPrices = hasVariants ? p.variants!.map((v) => v.price) : []
  const minPrice = hasVariants ? Math.min(...variantPrices) : p.price
  const maxPrice = hasVariants ? Math.max(...variantPrices) : p.price
  const displayPrice = activeVariant ? activeVariant.price : minPrice
  const displayStock = hasVariants ? (activeVariant ? activeVariant.stock : null) : p.stock

  // Compute discount — use selected variant's own discount, or best among all variants, or product-level
  const imgDiscountPct = activeVariant
    ? (activeVariant.originalPrice && activeVariant.originalPrice > activeVariant.price
      ? Math.round((1 - activeVariant.price / activeVariant.originalPrice) * 100) : 0)
    : hasVariants
      ? Math.max(0, ...p.variants!.map((v) => v.originalPrice && v.originalPrice > v.price ? Math.round((1 - v.price / v.originalPrice) * 100) : 0))
      : (p.originalPrice && p.originalPrice > displayPrice ? Math.round((1 - displayPrice / p.originalPrice) * 100) : 0)
  const hasDiscount = p.originalPrice && p.originalPrice > displayPrice
  const discountPercent = hasDiscount ? Math.round((1 - displayPrice / p.originalPrice!) * 100) : 0

  const descLines = p.description?.split("\n").filter(Boolean) ?? []
  const mainDesc = descLines[0] ?? ""
  const specs = descLines.slice(1)

  return (
    <div
      ref={ref}
      className="col-span-full bg-[#14141f] rounded-2xl border border-cyan-400/20 overflow-hidden shadow-2xl shadow-cyan-500/5"
      style={{ animation: "expandIn 0.25s ease-out" }}
    >
      <div className="flex flex-col md:flex-row">
        {/* ─── Image Gallery ─── */}
        <div className="md:w-[45%] lg:w-[40%] bg-[#1a1a28] p-4 md:p-6">
          {/* Main image — clickable to detail page */}
          <Link
            href={`/products/${p.category}/${encodeURIComponent(p.slug)}`}
            onClick={(e) => e.stopPropagation()}
            className="block aspect-square bg-[#1e2035] rounded-xl relative overflow-hidden group/img"
          >
            {allImages[selectedImg] ? (
              <Image
                src={allImages[selectedImg]}
                alt={p.name}
                fill
                className="object-contain p-3 group-hover/img:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-600">รูปสินค้า</span>
              </div>
            )}
            {imgDiscountPct > 0 && (
              <div className={`absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg pointer-events-none ${imgDiscountPct >= 20 ? "bg-red-500" : "bg-orange-500"}`}>
                -{imgDiscountPct}%
              </div>
            )}
          </Link>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelectedImg(i) }}
                  className={`w-14 h-14 md:w-16 md:h-16 relative rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    i === selectedImg
                      ? "border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Product Info ─── */}
        <div className="flex-1 p-5 md:p-6 lg:p-8 relative">
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="ปิด"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Brand & Category */}
          <div className="flex items-center gap-2 text-sm">
            {p.brand && <span className="text-cyan-400 font-semibold">{p.brand}</span>}
            {p.brand && <span className="text-gray-600">|</span>}
            <span className="text-gray-400">{categoryLabel}</span>
          </div>

          {/* Name */}
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white mt-2 leading-snug pr-10">{p.name}</h3>

          {/* SKU */}
          {p.sku && <p className="text-xs text-gray-500 mt-1 font-mono">SKU: {p.sku}</p>}

          {/* Variants */}
          {hasVariants && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">ตัวเลือก</h4>
              <div className="flex flex-wrap gap-2">
                {p.variants!.map((v, i) => {
                  const vPct = v.originalPrice && v.originalPrice > v.price
                    ? Math.round((1 - v.price / v.originalPrice) * 100) : 0
                  return (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setSelectedVariant(selectedVariant === i ? null : i) }}
                    className={`px-3 py-2 rounded-xl text-left border transition-all min-w-[120px] ${
                      v.stock <= 0
                        ? "opacity-40 border-white/5 text-gray-500"
                        : selectedVariant === i
                          ? "bg-cyan-500/15 border-cyan-400/50 text-white"
                          : "bg-[#1a1a28] border-white/10 text-gray-300 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-sm">{v.label}</span>
                      <span className="text-amber-400 font-bold">฿{v.price.toLocaleString()}</span>
                    </div>
                    {vPct > 0 && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-gray-500 text-[11px] line-through">฿{v.originalPrice!.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold px-1 rounded ${vPct >= 20 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>-{vPct}%</span>
                      </div>
                    )}
                    {v.stock <= 0 && <p className="text-red-400 text-[10px] mt-0.5">สินค้าหมด</p>}
                  </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            {hasVariants && !activeVariant ? (
              <p className="text-2xl md:text-3xl font-black text-amber-400">
                {minPrice === maxPrice
                  ? `฿${minPrice.toLocaleString()}`
                  : `฿${minPrice.toLocaleString()} — ฿${maxPrice.toLocaleString()}`}
              </p>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-black text-amber-400">
                  ฿{displayPrice.toLocaleString()}
                </p>
                {hasDiscount && (
                  <p className="text-gray-500 text-sm line-through">฿{p.originalPrice!.toLocaleString()}</p>
                )}
              </>
            )}
          </div>
          {hasDiscount && (
            <p className="text-sm text-emerald-400 mt-1">ประหยัด ฿{(p.originalPrice! - displayPrice).toLocaleString()}</p>
          )}

          {/* Stock */}
          <div className="mt-3 flex items-center gap-2">
            {displayStock === null ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400 text-xs">กรุณาเลือกตัวเลือก</span>
              </>
            ) : displayStock > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs">มีสินค้า ({displayStock} ชิ้น)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 text-xs">สินค้าหมด</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-4" />

          {/* Description & Specs */}
          {mainDesc && <p className="text-gray-300 text-sm leading-relaxed">{mainDesc}</p>}
          {specs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {specs.slice(0, 6).map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <svg className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{line.replace(/^[•·\-–]\s*/, "")}</span>
                </div>
              ))}
              {specs.length > 6 && (
                <p className="text-gray-500 text-xs pl-5">+{specs.length - 6} รายการเพิ่มเติม</p>
              )}
            </div>
          )}

          {/* CTA — clear hierarchy: primary → secondary → tertiary */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <ContactLink
              type="line"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 bg-[#06C755] text-white font-bold px-6 py-3.5 rounded-xl text-sm hover:bg-[#05b34d] transition-colors shadow-lg shadow-green-500/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              สั่งซื้อผ่าน LINE
            </ContactLink>
            <div className="flex gap-2.5">
              <ContactLink
                type="phone"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 text-white/70 font-medium px-4 py-2.5 rounded-xl text-xs border border-white/10 hover:border-white/20 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                โทร
              </ContactLink>
              <Link
                href={`/products/${p.category}/${encodeURIComponent(p.slug)}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 text-cyan-400/80 hover:text-cyan-300 text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-[#1a1a28] hover:bg-[#1e1e30] border border-white/10 hover:border-cyan-400/30 transition-all whitespace-nowrap"
              >
                ดูรายละเอียด
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
