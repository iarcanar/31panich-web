import { getFeaturedProducts } from "@/lib/medusa"
import ProductCard from "@/components/product/ProductCard"

export default async function FeaturedProducts() {
  // TODO: ดึงจาก Medusa API เมื่อ backend พร้อม
  // const products = await getFeaturedProducts(8)

  return (
    <section className="bg-slate-800 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-10">
          สินค้าแนะนำ
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* TODO: map products เมื่อ backend พร้อม */}
          <div className="bg-slate-700 rounded-xl p-4 text-center text-gray-400 aspect-square flex items-center justify-center">
            สินค้าจะแสดงเมื่อเชื่อมต่อ Medusa
          </div>
        </div>
      </div>
    </section>
  )
}
