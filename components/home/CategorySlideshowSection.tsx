import { getProducts, CATEGORIES } from "@/lib/products"
import CategorySlideshow from "./CategorySlideshow"

export default async function CategorySlideshowSection() {
  const allProducts = await getProducts()

  const slides = CATEGORIES
    .map((cat) => {
      const products = allProducts.filter((p) => p.category === cat.value && p.image)
      if (products.length === 0) return null
      const pick = products[Math.floor(Math.random() * products.length)]
      return { category: cat.value, label: cat.label, image: pick.image }
    })
    .filter(Boolean) as { category: string; label: string; image: string }[]

  if (slides.length < 2) return null

  return <CategorySlideshow slides={slides} />
}
