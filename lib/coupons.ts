import { readJSON, writeJSON, withLock } from "./blob-store"

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
  testMode: boolean     // true = แสดงเฉพาะหน้าทดสอบ (/admin/test-claim)
  usageLimit: number
  usageCount: number
  claimCount: number
  stackWithPoints: boolean
  allowRepeatClaim: boolean  // true = ลูกค้ารับซ้ำได้ (ไม่ซ่อน card หลังรับ)
  serialPrefix: string
  createdAt: string
  updatedAt: string
}

export type CouponInput = Omit<Coupon, "id" | "createdAt" | "updatedAt" | "usageCount" | "claimCount" | "stackWithPoints" | "allowRepeatClaim" | "testMode" | "serialPrefix"> & { stackWithPoints?: boolean; allowRepeatClaim?: boolean; testMode?: boolean }

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
    .filter((c) => c.isActive && !c.testMode && c.startDate <= now && c.endDate >= now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getTestCoupons(): Promise<Coupon[]> {
  return (await readAll())
    .filter((c) => c.testMode)
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
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const now = new Date().toISOString()
    const coupon: Coupon = {
      ...input,
      code: input.code || await generateCode(),
      id: crypto.randomUUID(),
      usageCount: 0,
      claimCount: 0,
      stackWithPoints: input.stackWithPoints ?? true,
      allowRepeatClaim: input.allowRepeatClaim ?? false,
      testMode: input.testMode ?? false,
      serialPrefix: await generateSerialPrefix(),
      createdAt: now,
      updatedAt: now,
    }
    coupons.push(coupon)
    await writeAll(coupons)
    return coupon
  })
}

export async function updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon | null> {
  return withLock(FILE, async () => {
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
  })
}

export async function deleteCoupon(id: string): Promise<boolean> {
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const filtered = coupons.filter((c) => c.id !== id)
    if (filtered.length === coupons.length) return false
    await writeAll(filtered)
    return true
  })
}

export async function incrementClaimCount(id: string): Promise<number> {
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const idx = coupons.findIndex((c) => c.id === id)
    if (idx === -1) return 0
    coupons[idx].claimCount = (coupons[idx].claimCount || 0) + 1
    coupons[idx].updatedAt = new Date().toISOString()
    await writeAll(coupons)
    return coupons[idx].claimCount
  })
}

/** Reset claimCount to 0 (admin reset all). */
export async function resetClaimCount(id: string): Promise<void> {
  await withLock(FILE, async () => {
    const coupons = await readAll()
    const idx = coupons.findIndex((c) => c.id === id)
    if (idx === -1) return
    coupons[idx].claimCount = 0
    coupons[idx].usageCount = 0
    coupons[idx].updatedAt = new Date().toISOString()
    await writeAll(coupons)
  })
}

/** Decrement claimCount by 1 (admin revert). Returns new count. */
export async function decrementClaimCount(id: string): Promise<number> {
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const idx = coupons.findIndex((c) => c.id === id)
    if (idx === -1) return 0
    coupons[idx].claimCount = Math.max(0, (coupons[idx].claimCount || 0) - 1)
    coupons[idx].updatedAt = new Date().toISOString()
    await writeAll(coupons)
    return coupons[idx].claimCount
  })
}

/**
 * Atomic claim: check limit + increment in one lock.
 * Returns { ok, count, soldOut } — if limit reached, ok=false and count is NOT incremented.
 */
export async function atomicClaim(id: string): Promise<{ ok: boolean; count: number; soldOut: boolean }> {
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const idx = coupons.findIndex((c) => c.id === id)
    if (idx === -1) return { ok: false, count: 0, soldOut: false }

    const c = coupons[idx]
    const currentCount = c.claimCount || 0

    // Check limit INSIDE the lock
    if (c.usageLimit > 0 && currentCount >= c.usageLimit) {
      return { ok: false, count: currentCount, soldOut: true }
    }

    // Increment
    coupons[idx].claimCount = currentCount + 1
    coupons[idx].updatedAt = new Date().toISOString()
    await writeAll(coupons)

    const newCount = coupons[idx].claimCount
    return { ok: true, count: newCount, soldOut: c.usageLimit > 0 && newCount >= c.usageLimit }
  })
}

export async function incrementUsage(id: string): Promise<Coupon | null> {
  return withLock(FILE, async () => {
    const coupons = await readAll()
    const idx = coupons.findIndex((c) => c.id === id)
    if (idx === -1) return null
    coupons[idx].usageCount += 1
    coupons[idx].updatedAt = new Date().toISOString()
    await writeAll(coupons)
    return coupons[idx]
  })
}
