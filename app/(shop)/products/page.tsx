import { Metadata } from "next"
import Link from "next/link"
import CategoryGrid from "@/components/home/CategoryGrid"
import { searchProducts, getProducts, CATEGORIES } from "@/lib/products"
import CategoryProductGrid from "@/components/product/CategoryProductGrid"
import { breadcrumbSchema } from "@/lib/structured-data"

type Props = { searchParams: Promise<{ search?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { search } = await searchParams
  if (search?.trim()) {
    return {
      title: `ค้นหา "${search}" | สามหนึ่งพานิช`,
      description: `ผลการค้นหา "${search}" — สินค้าวัสดุก่อสร้าง เครื่องมือช่าง ร้านสามหนึ่งพานิช ลพบุรี`,
    }
  }
  return {
    title: "สินค้าวัสดุก่อสร้าง เครื่องมือช่าง ลพบุรี",
    description: "สินค้าวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา สีทาบ้าน ครบวงจร ร้านสามหนึ่งพานิช จ.ลพบุรี เปิดทุกวัน ราคาถูก",
    openGraph: {
      title: "สินค้าวัสดุก่อสร้าง เครื่องมือช่าง — ร้านสามหนึ่งพานิช ลพบุรี",
      description: "สินค้าวัสดุก่อสร้าง เครื่องมือช่าง อุปกรณ์ไฟฟ้า ประปา สีทาบ้าน ครบวงจร จ.ลพบุรี",
    },
  }
}

const breadcrumb = breadcrumbSchema([
  { name: "หน้าแรก", url: "/" },
  { name: "สินค้า" },
])

export default async function ProductsPage({ searchParams }: Props) {
  const { search } = await searchParams
  const query = search?.trim() ?? ""

  // No search query → show category grid as before
  if (!query) {
    return (
      <div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
        <CategoryGrid />
      </div>
    )
  }

  // Search mode
  const results = await searchProducts(query)

  const recommended = results.length > 0
    ? []
    : (await getProducts())
        .filter((p) => p.price > 0 && p.stock > 0 && p.image)
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
          <span className="text-gray-300">ค้นหา</span>
        </nav>
      </div>

      {/* Header */}
      <div className="container mx-auto px-4 pt-2 pb-6 md:pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
          <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          ผลการค้นหา &ldquo;{query}&rdquo;
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {results.length > 0
            ? `พบ ${results.length} สินค้า`
            : "ไม่พบสินค้าที่ตรงกับคำค้นหา"}
        </p>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-16">
        {results.length > 0 ? (
          <CategoryProductGrid
            products={JSON.parse(JSON.stringify(results))}
            categoryLabel="ผลการค้นหา"
            categoryValue="search"
            recommended={[]}
          />
        ) : (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-[#2a2a3a] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">ไม่พบสินค้า &ldquo;{query}&rdquo;</p>
            <p className="text-gray-600 text-sm mb-6">ลองค้นหาด้วยคำอื่น หรือเลือกจากหมวดหมู่ด้านล่าง</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              ดูหมวดหมู่ทั้งหมด
            </Link>

            {/* Recommended when no results */}
            {recommended.length > 0 && (
              <div className="mt-12 text-left">
                <h2 className="text-lg font-bold text-white mb-1">สินค้าแนะนำ</h2>
                <p className="text-gray-500 text-sm mb-5">สินค้าอื่นที่อาจสนใจ</p>
                <CategoryProductGrid
                  products={JSON.parse(JSON.stringify(recommended.map((r) => {
                    const full = results.find(() => false) // just use recommended shape
                    return { ...r, description: "", originalPrice: null, images: [], stock: 1, isNew: false, isBestseller: false, brand: "", sku: "", variants: [] }
                  })))}
                  categoryLabel="สินค้าแนะนำ"
                  categoryValue="recommended"
                  recommended={[]}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
