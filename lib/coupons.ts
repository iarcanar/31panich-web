import { readJSON, writeJSON } from "./blob-store"

// ─── Types ───────────────────────────────────────────────
export interface Coupon {
  id: string
  code: string
  title: string
  description: string
  image: string
  discountType: "percent" | "fixed" | "gift"
  discountValue: number
  giftDescription: string
  category: string | null
  minPurchase: number
  startDate: string
  endDate: string
  isActive: boolean
  usageLimit: number
  usageCount: number
  claimCount: number
  stackWithPoints: boolean
  serialPrefix: string
  createdAt: string
  updatedAt: string
}

export type CouponInput = Omit<Coupon, "id" | "createdAt" | "updatedAt" | "usageCount" | "claimCount" | "stackWithPoints" | "serialPrefix"> & { stackWithPoints?: boolean }

// ─── Data helpers (async, dual-mode via blob-store) ─────
const FILE = "coupons.json"

async function readAll(): Promise<Coupon[]> {
  return await readJSON<Coupon[]>(FILE, [])
}

async function writeAll(coupons: Coupon[]): Promise<void> {
  await writeJSON(FILE, coupons)
}

// ─── Code & serial prefix generation ────────────────────
const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const PREFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"

export async function generateCode(length = 6): Promise<string> {
  const all = await readAll()
  const existing = new Set(all.map((c) => c.code))
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
    }
    if (!existing.has(code)) return code
  }
  return crypto.randomUUID().slice(0, length).toUpperCase()
}

async function generateSerialPrefix(): Promise<string> {
  const all = await readAll()
  const existing = new Set(all.map((c) => c.serialPrefix).filter(Boolean))
  for (const ch of PREFIX_CHARS) {
    if (!existing.has(ch)) return ch
  }
  // Fallback: 2-letter prefix
  for (const a of PREFIX_CHARS) {
    for (const b of PREFIX_CHARS) {
      const prefix = a + b
      if (!existing.has(prefix)) return prefix
    }
  }
  return crypto.randomUUID().slice(0, 2).toUpperCase()
}

// ─── Read helpers ────────────────────────────────────────
export async function getCoupons(): Promise<Coupon[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getActiveCoupons(): Promise<Coupon[]> {
  const now = new Date().toISOString()
  return (await readAll())
    .filter((c) => c.isActive && c.startDate <= now && c.endDate >= now && (c.usageLimit === 0 || c.usageCount < c.usageLimit))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getCouponById(id: string): Promise<Coupon | undefined> {
  return (await readAll()).find((c) => c.id === id)
}

export async function getCouponByCode(code: string): Promise<Coupon | undefined> {
  return (await readAll()).find((c) => c.code.toUpperCase() === code.toUpperCase())
}

// ─── Write helpers ───────────────────────────────────────
export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const coupons = await readAll()
  const now = new Date().toISOString()
  const coupon: Coupon = {
    ...input,
    code: input.code || await generateCode(),
    id: crypto.randomUUID(),
    usageCount: 0,
    claimCount: 0,
    stackWithPoints: input.stackWithPoints ?? true,
    serialPrefix: await generateSerialPrefix(),
    createdAt: now,
    updatedAt: now,
  }
  coupons.push(coupon)
  await writeAll(coupons)
  return coupon
}

export async function updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon | null> {
  const coupons = await readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx] = {
    ...coupons[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  }
  await writeAll(coupons)
  return coupons[idx]
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const coupons = await readAll()
  const filtered = coupons.filter((c) => c.id !== id)
  if (filtered.length === coupons.length) return false
  await writeAll(filtered)
  return true
}

// ─── Claim: ลูกค้ากดรับ → ได้ serial 31-A1, 31-A2, ... ──
export async function claimCoupon(id: string): Promise<{ coupon: Coupon; serial: string; claimedAt: string } | null> {
  const coupons = await readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx].claimCount += 1
  coupons[idx].updatedAt = new Date().toISOString()
  const num = coupons[idx].claimCount
  // ใช้ serialPrefix ที่ผูกกับ coupon ถาวร (ไม่เปลี่ยนเมื่อลบคูปองอื่น)
  const prefix = coupons[idx].serialPrefix || String.fromCharCode(65 + (idx % 26))
  const serial = `31-${prefix}${num}`
  await writeAll(coupons)
  return { coupon: coupons[idx], serial, claimedAt: new Date().toISOString() }
}

export async function incrementUsage(id: string): Promise<Coupon | null> {
  const coupons = await readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx].usageCount += 1
  coupons[idx].updatedAt = new Date().toISOString()
  await writeAll(coupons)
  return coupons[idx]
}
