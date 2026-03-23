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
      className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition group"
    >
      <div className="aspect-square relative bg-gray-100">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2">{product.title}</h3>
        {price && (
          <p className="mt-1 text-lg font-bold text-blue-700">
            ฿{(price.amount / 100).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  )
}
