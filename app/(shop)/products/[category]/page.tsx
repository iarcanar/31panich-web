import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProductsByCategory, getProducts, CATEGORIES } from "@/lib/products"
import CategoryProductGrid from "@/components/product/CategoryProductGrid"
import CategoryBreadcrumb from "@/components/product/CategoryBreadcrumb"
import { breadcrumbSchema } from "@/lib/structured-data"

export const revalidate = 3600 // ISR: revalidate ทุก 1 ชั่วโมง

type Props = { params: Promise<{ category: string }> }

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.value }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = CATEGORIES.find((c) => c.value === category)
  if (!cat) return {}
  return {
    title: `${cat.label} ลพบุรี | ร้านสามหนึ่งพานิช`,
    description: `ซื้อ${cat.label} คุณภาพดี ราคาถูก ที่ร้านสามหนึ่งพานิช จ.ลพบุรี สินค้าแบรนด์แท้ มีรับประกัน เปิดทุกวัน`,
    openGraph: {
      title: `${cat.label} — ร้านสามหนึ่งพานิช ลพบุรี`,
      description: `สินค้า${cat.label} คุณภาพดี ราคาถูก ร้านสามหนึ่งพานิช จ.ลพบุรี`,
    },
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

  const breadcrumb = breadcrumbSchema([
    { name: "หน้าแรก", url: "/" },
    { name: "สินค้า", url: "/products" },
    { name: cat.label },
  ])

  return (
    <div className="bg-[#0e0e14] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Breadcrumb with back button + icon-prefixed active chip */}
      <CategoryBreadcrumb categoryLabel={cat.label} categoryValue={category} />

      {/* Count */}
      <div className="container mx-auto px-4 pt-2 pb-6 md:pb-8">
        <p className="text-gray-500 text-sm text-center">{products.length} สินค้า</p>

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
