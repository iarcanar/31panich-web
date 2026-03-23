import { getProductsByCategory, CATEGORIES } from "@/lib/products"
import CategorySlideshow from "./CategorySlideshow"

export default function CategorySlideshowSection() {
  const slides = CATEGORIES
    .map((cat) => {
      const products = getProductsByCategory(cat.value).filter((p) => p.image)
      if (products.length === 0) return null
      // Pick a random product image
      const pick = products[Math.floor(Math.random() * products.length)]
      return {
        category: cat.value,
        label: cat.label,
        image: pick.image,
      }
    })
    .filter(Boolean) as { category: string; label: string; image: string }[]

  if (slides.length < 2) return null

  return <CategorySlideshow slides={slides} />
}
