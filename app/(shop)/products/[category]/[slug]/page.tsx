import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductBySlug, getProductsByCategory, CATEGORIES } from "@/lib/products"
import { getCatalogById } from "@/lib/catalogs"
import { breadcrumbSchema } from "@/lib/structured-data"
import ProductDetailView from "@/components/product/ProductDetailView"

type Props = { params: Promise<{ category: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(decodeURIComponent(slug))
  if (!product) return {}
  const catLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category
  const desc = product.description?.split("\n").filter(Boolean).join(" ").slice(0, 160)
    || `${product.name} - ${catLabel} | สามหนึ่งพานิช ลพบุรี`
  return {
    title: `${product.name} | สามหนึ่งพานิช`,
    description: desc,
    keywords: product.tags?.join(", "),
    openGraph: {
      title: product.name,
      description: desc,
      images: product.images?.length ? product.images : product.image ? [product.image] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug, category } = await params
  const product = await getProductBySlug(decodeURIComponent(slug))
  if (!product) notFound()

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category
  const relatedProducts = (await getProductsByCategory(category)).filter((p) => p.id !== product.id).slice(0, 4)

  const seller = { "@type": "Organization", name: "สามหนึ่งพานิช" }
  const offers = product.variants?.length
    ? product.variants.map((v) => ({
        "@type": "Offer" as const, priceCurrency: "THB", name: v.label, price: v.price,
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller,
      }))
    : [{
        "@type": "Offer" as const, priceCurrency: "THB", price: product.price,
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller,
      }]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.length ? product.images : product.image ? [product.image] : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    sku: product.sku || undefined,
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", lowPrice: Math.min(...offers.map((o) => o.price)), highPrice: Math.max(...offers.map((o) => o.price)), priceCurrency: "THB", offerCount: offers.length, offers },
  }

  const breadcrumb = breadcrumbSchema([
    { name: "หน้าแรก", url: "/" },
    { name: "สินค้า", url: "/products" },
    { name: categoryLabel, url: `/products/${category}` },
    { name: product.name },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ProductDetailView product={product} categoryLabel={categoryLabel} relatedProducts={relatedProducts} catalog={product.catalogId ? getCatalogById(product.catalogId) : null} />
    </>
  )
}
