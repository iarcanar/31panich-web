import fs from "fs"
import path from "path"

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

// ─── File helpers (cached read, invalidate on write) ────
const DATA_PATH = path.join(process.cwd(), "data", "coupons.json")

let _cache: Coupon[] | null = null
let _cacheMtime = 0

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]", "utf-8")
}

function readAll(): Coupon[] {
  try {
    ensureDataFile()
    const stat = fs.statSync(DATA_PATH)
    const mtime = stat.mtimeMs
    if (_cache && mtime === _cacheMtime) return JSON.parse(JSON.stringify(_cache))
    const raw = fs.readFileSync(DATA_PATH, "utf-8")
    _cache = JSON.parse(raw)
    _cacheMtime = mtime
    return JSON.parse(JSON.stringify(_cache))
  } catch {
    _cache = null
    return []
  }
}

function writeAll(coupons: Coupon[]) {
  ensureDataFile()
  fs.writeFileSync(DATA_PATH, JSON.stringify(coupons, null, 2), "utf-8")
  _cache = null
}

// ─── Code & serial prefix generation ────────────────────
const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const PREFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"

export function generateCode(length = 6): string {
  const all = readAll()
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

function generateSerialPrefix(): string {
  const all = readAll()
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
export function getCoupons(): Coupon[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getActiveCoupons(): Coupon[] {
  const now = new Date().toISOString()
  return readAll()
    .filter((c) => c.isActive && c.startDate <= now && c.endDate >= now && (c.usageLimit === 0 || c.usageCount < c.usageLimit))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getCouponById(id: string): Coupon | undefined {
  return readAll().find((c) => c.id === id)
}

export function getCouponByCode(code: string): Coupon | undefined {
  return readAll().find((c) => c.code.toUpperCase() === code.toUpperCase())
}

// ─── Write helpers ───────────────────────────────────────
export function createCoupon(input: CouponInput): Coupon {
  const coupons = readAll()
  const now = new Date().toISOString()
  const coupon: Coupon = {
    ...input,
    code: input.code || generateCode(),
    id: crypto.randomUUID(),
    usageCount: 0,
    claimCount: 0,
    stackWithPoints: input.stackWithPoints ?? true,
    serialPrefix: generateSerialPrefix(),
    createdAt: now,
    updatedAt: now,
  }
  coupons.push(coupon)
  writeAll(coupons)
  return coupon
}

export function updateCoupon(id: string, input: Partial<CouponInput>): Coupon | null {
  const coupons = readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx] = {
    ...coupons[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  }
  writeAll(coupons)
  return coupons[idx]
}

export function deleteCoupon(id: string): boolean {
  const coupons = readAll()
  const filtered = coupons.filter((c) => c.id !== id)
  if (filtered.length === coupons.length) return false
  writeAll(filtered)
  return true
}

// ─── Claim: ลูกค้ากดรับ → ได้ serial 31-A1, 31-A2, ... ──
export function claimCoupon(id: string): { coupon: Coupon; serial: string; claimedAt: string } | null {
  const coupons = readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx].claimCount += 1
  coupons[idx].updatedAt = new Date().toISOString()
  const num = coupons[idx].claimCount
  // ใช้ serialPrefix ที่ผูกกับ coupon ถาวร (ไม่เปลี่ยนเมื่อลบคูปองอื่น)
  const prefix = coupons[idx].serialPrefix || String.fromCharCode(65 + (idx % 26))
  const serial = `31-${prefix}${num}`
  writeAll(coupons)
  return { coupon: coupons[idx], serial, claimedAt: new Date().toISOString() }
}

export function incrementUsage(id: string): Coupon | null {
  const coupons = readAll()
  const idx = coupons.findIndex((c) => c.id === id)
  if (idx === -1) return null
  coupons[idx].usageCount += 1
  coupons[idx].updatedAt = new Date().toISOString()
  writeAll(coupons)
  return coupons[idx]
}
