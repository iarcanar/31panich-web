// Client-safe coupon status helper — ไม่มี server-only imports
// ใช้ได้ทั้งใน client component และ server code

import type { Coupon } from "./coupons"

export type CouponStatus = "active" | "upcoming" | "expired" | "sold_out" | "hidden"

/**
 * คำนวณสถานะคูปองจากข้อมูลดิบ — single source of truth สำหรับ display + validation
 * - hidden:   isActive=false หรือ testMode=true → ซ่อนหน้าเว็บทุกกรณี
 * - upcoming: ยังไม่ถึง startDate
 * - expired:  เลย endDate แล้ว
 * - sold_out: ถึงจำนวน usageLimit แล้ว
 * - active:   พร้อมให้รับ
 */
export function getCouponStatus(c: Coupon, nowISO?: string): CouponStatus {
  if (!c.isActive || c.testMode) return "hidden"
  const now = nowISO || new Date().toISOString()
  if (c.startDate > now) return "upcoming"
  if (c.endDate < now) return "expired"
  if (c.usageLimit > 0 && (c.claimCount || 0) >= c.usageLimit) return "sold_out"
  return "active"
}
