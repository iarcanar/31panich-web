import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductBySlug, getProductsByCategory, CATEGORIES } from "@/lib/products"
import { getCatalogById } from "@/lib/catalogs"
import { breadcrumbSchema } from "@/lib/structured-data"
import ProductDetailView from "@/components/product/ProductDetailView"

// Force dynamic rendering on every request.
//
// Why: previously this page used `generateStaticParams` + `revalidate = 3600`
// which works fine until a user creates or renames a product (changing its
// slug). The new slug is not in the static params, so Vercel has to do an
// on-demand ISR render at runtime — and that has been failing with HTTP 500
// for newly-created Thai-slug products since Vercel moved the runtime to
// Node 24. Pre-rendered pages from the build still work, only the freshly-
// created ones fail.
//
// Trade-off: each product page now costs one function invocation per visit
// instead of being served from the static cache. With ~150 products and
// modest traffic (target ~10 views/product/day) this is well under the
// Vercel Hobby soft limit (~100k invocations/day) and the response is fast
// because product data lives in Upstash Redis with a 5-minute in-memory cache
// (see lib/blob-store.ts).
//
// Long term: investigate the on-demand ISR failure and revert this if Vercel
// fixes it. See web/docs/debugging.md.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ category: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(decodeURIComponent(slug))
  if (!product) return {}
  const catLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category
  const desc = product.description?.split("\n").filter(Boolean).join(" ").slice(0, 160)
    || `${product.name} - ${catLabel} | สามหนึ่งพานิช ลพบุรี`
  return {
    title: `${product.name} | ร้านสามหนึ่งพานิช ลพบุรี`,
    description: desc,
    keywords: product.tags ? [...product.tags, "ลพบุรี", "สามหนึ่งพานิช"].join(", ") : undefined,
    openGraph: {
      title: `${product.name} — สามหนึ่งพานิช`,
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
