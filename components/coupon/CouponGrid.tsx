"use client"

import type { Coupon } from "@/lib/coupons"
import CouponCard from "./CouponCard"

export default function CouponGrid({ coupons }: { coupons: Coupon[] }) {
  if (coupons.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {coupons.map((c) => (
        <CouponCard key={c.id} coupon={c} />
      ))}
    </div>
  )
}
