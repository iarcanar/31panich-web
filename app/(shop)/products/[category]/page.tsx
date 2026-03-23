import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProductsByCategory, getProducts, CATEGORIES } from "@/lib/products"
import CategoryProductGrid from "@/components/product/CategoryProductGrid"

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = CATEGORIES.find((c) => c.value === category)
  if (!cat) return {}
  return {
    title: `${cat.label} | สามหนึ่งพานิช`,
    description: `สินค้า${cat.label} คุณภาพดี ราคาถูก ที่ สามหนึ่งพานิช ลพบุรี`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const cat = CATEGORIES.find((c) => c.value === category)
  if (!cat) notFound()

  const products = await getProductsByCategory(category)

  // Recommended: products from other categories (with image & in-stock)
  const recommended = (await getProducts())
    .filter((p) => p.category !== category && p.price > 0 && p.stock > 0 && p.image)
    .slice(0, 16)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      category: p.category,
      categoryLabel: CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category,
      image: p.image,
    }))

  return (
    <div className="bg-[#0e0e14] min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-white transition">หน้าแรก</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-white transition">สินค้า</Link>
          <span>/</span>
          <span className="text-gray-300">{cat.label}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="container mx-auto px-4 pt-2 pb-6 md:pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
          <img src={`/category-icons/${category}.svg`} alt="" className="h-[1em] w-[1em]" />
          {cat.label}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{products.length} สินค้า</p>

        {/* Category pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto md:overflow-visible md:flex-wrap pb-2 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {CATEGORIES.map((c) => {
            const isActive = c.value === category
            return (
              <Link
                key={c.value}
                href={`/products/${c.value}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                  isActive
                    ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <img src={`/category-icons/${c.value}.svg`} alt="" className="h-[1em] w-[1em] opacity-70" />
                {c.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 pb-16">
        <CategoryProductGrid
          products={JSON.parse(JSON.stringify(products))}
          categoryLabel={cat.label}
          categoryValue={category}
          recommended={recommended}
        />
      </div>
    </div>
  )
}
