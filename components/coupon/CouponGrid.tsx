"use client"

import type { Coupon } from "@/lib/coupons"
import CouponCard from "./CouponCard"

export default function CouponGrid({ coupons, upcoming = [] }: { coupons: Coupon[]; upcoming?: Coupon[] }) {
  if (coupons.length === 0 && upcoming.length === 0) return null

  return (
    <div className="space-y-6">
      {coupons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">🕐 เร็วๆ นี้</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((c) => (
              <CouponCard key={c.id} coupon={c} upcoming />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
