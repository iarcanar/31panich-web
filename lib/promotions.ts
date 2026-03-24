import promotionsData from "@/data/promotions.json"
import type { Promotion } from "@/types/promotion"

export function getActivePromotions(): Promotion[] {
  const today = new Date().toISOString().split("T")[0]
  return (promotionsData as Promotion[])
    .filter((p) => p.active && (!p.expiry || p.expiry >= today))
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
}
