"use client"

import Image from "next/image"
import { useState } from "react"
import ContactLink from "@/components/ui/ContactLink"

type Props = {
  product: {
    title: string
    description?: string
    images?: { url: string }[]
    variants?: {
      title: string
      sku?: string
      prices?: { amount: number; currency_code: string }[]
      inventory_quantity?: number
    }[]
    metadata?: Record<string, string>
  }
}

export default function ProductDetail({ product }: Props) {
  const [selectedImage, setSelectedImage] = useState(0)
  const images = product.images ?? []
  const variant = product.variants?.[0]
  const price = variant?.prices?.[0]

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Images */}
        <div className="flex-1">
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            {images[selectedImage] ? (
              <Image
                src={images[selectedImage].url}
                alt={product.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 relative rounded-lg overflow-hidden border-2 ${
                    i === selectedImage ? "border-blue-500" : "border-transparent"
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.title}</h1>

          {variant?.sku && (
            <p className="mt-1 text-sm text-gray-500">รหัสสินค้า: {variant.sku}</p>
          )}

          {price && (
            <p className="mt-4 text-3xl font-bold text-blue-700">
              ฿{(price.amount / 100).toLocaleString()}
            </p>
          )}

          {variant?.inventory_quantity !== undefined && (
            <p className={`mt-2 text-sm ${variant.inventory_quantity > 0 ? "text-green-600" : "text-red-500"}`}>
              {variant.inventory_quantity > 0 ? `มีสินค้า (${variant.inventory_quantity} ชิ้น)` : "สินค้าหมด"}
            </p>
          )}

          {product.description && (
            <div className="mt-6 prose prose-sm text-gray-700">
              <h3 className="text-lg font-semibold">รายละเอียด</h3>
              <p>{product.description}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <ContactLink
              type="line"
              className="bg-[#06C755] text-white font-semibold px-8 py-3 rounded-full text-center hover:bg-[#05b34d] transition"
            >
              💬 สั่งซื้อผ่าน LINE
            </ContactLink>
            <ContactLink
              type="phone"
              className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-full text-center hover:bg-blue-700 transition"
            >
              📞 โทรสอบถาม
            </ContactLink>
          </div>
        </div>
      </div>
    </section>
  )
}
