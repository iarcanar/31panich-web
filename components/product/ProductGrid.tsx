import ProductCard from "./ProductCard"

type Props = {
  products: any[]
}

export default function ProductGrid({ products }: Props) {
  if (!products.length) {
    return (
      <div className="flex-1 text-center py-20 text-gray-500">
        ไม่พบสินค้าในหมวดหมู่นี้
      </div>
    )
  }

  return (
    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
