import Image from "next/image"
import Link from "next/link"

type Props = {
  product: {
    handle: string
    title: string
    thumbnail?: string
    description?: string
    variants?: { prices?: { amount: number; currency_code: string }[] }[]
    collection?: { handle: string }
  }
}

export default function ProductCard({ product }: Props) {
  const price = product.variants?.[0]?.prices?.[0]
  const categorySlug = product.collection?.handle ?? "all"

  return (
    <Link
      href={`/products/${categorySlug}/${product.handle}`}
      className="bg-[#1a1a28] rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 group"
    >
      <div className="aspect-square relative bg-[#252540] overflow-hidden">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-white line-clamp-2">{product.title}</h3>
        {price && (
          <p className="mt-1 text-lg font-bold text-amber-400">
            ฿{(price.amount / 100).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  )
}
