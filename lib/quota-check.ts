// Pure function: check Vercel + Upstash quota usage and return alerts
// with actionable recommendations. No I/O — call sites pass already-fetched
// vercel-status / upstash-status JSON shapes.
//
// Used by:
//   - app/admin/settings/page.tsx → render full alert section
//   - app/admin/layout.tsx       → show notification dot next to "ตั้งค่า"

const WARN_PCT = 70 // %  → yellow alert
const CRIT_PCT = 90 // %  → red alert

// ─── Types ─────────────────────────────────────────────

interface VercelInput {
  configured: boolean
  usage?: Record<string, unknown>
}

interface UpstashInput {
  configured: boolean
  memory?: { used: number; limit: number }
  dailyCommands?: { used: number; limit: number }
}

export type QuotaStatus = "ok" | "warning" | "critical"

export interface QuotaAlert {
  metric: string
  used: string
  limit: string
  percent: number
  level: "warning" | "critical"
  recommendations: string[]
}

export interface QuotaCheckResult {
  status: QuotaStatus
  alerts: QuotaAlert[]
  checkedAt: number
}

// ─── Recommendations table ─────────────────────────────
// Specific to 31panich's stack — text in Thai for the admin UI.

const RECOMMENDATIONS = {
  bandwidth: [
    "ลดขนาดรูปใน /public ที่เกิน 200KB → resize ผ่าน reMAGE preset Product (800×800, WebP q80)",
    "ใช้ Cloudinary URL transformations แทนรูป static — Cloudinary จัดการ resize ฝั่งเขา (ฟรี 25 GB/เดือน)",
    "ตรวจรูปสินค้าที่ใหญ่ผิดปกติ + replace ด้วยเวอร์ชัน optimized",
  ],
  serverless: [
    "เพิ่ม ISR revalidate ของหน้าคงที่ (about, contact, warranty, points) เป็น 24 ชั่วโมง",
    "ตรวจ admin pages ว่ามี polling loop ไหม → ใช้ Page Visibility API หยุด poll เมื่อ tab ไม่ active",
    "ตรวจ API routes ที่ใช้บ่อย → cache ผลด้วย unstable_cache หรือ in-memory cache",
  ],
  imageOpt: [
    "เพิ่ม images.minimumCacheTTL ใน next.config.ts → 31536000 (1 ปี)",
    "ใช้ <Image unoptimized={true}> สำหรับ icons / badges / SVG ที่ไม่ต้อง resize",
    "ลด deviceSizes / imageSizes ใน next.config.ts ให้เหลือ canonical sizes ที่ใช้จริง",
  ],
  upstashMemory: [
    "ตรวจ Redis keys ที่ไม่ใช้แล้ว: chat-logs (disabled), expired sessions, temp keys",
    "เพิ่ม TTL ให้ keys ที่ไม่ critical (cache:gemini:* มี TTL อยู่แล้ว — ตรวจอันอื่น)",
    "Compress JSON ก่อน save (เช่น remove whitespace, drop optional fields)",
  ],
  upstashCommands: [
    "เพิ่ม CACHE_TTL ใน lib/blob-store.ts จาก 5 นาที → 10-15 นาที (ลด Redis reads ครึ่งหนึ่ง)",
    "ตรวจว่า API route ใช้ React.cache() wrap getProducts() — ไม่ให้อ่าน Redis ซ้ำใน request เดียว",
    "ลดความถี่ที่ admin dashboard refresh (vercel-status / upstash-status cache แล้ว แต่ยังมีเรียกซ้ำ)",
  ],
}

// ─── Helpers ───────────────────────────────────────────

function pct(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0
  return Math.round((used / limit) * 1000) / 10 // 1 decimal place
}

function levelOf(percent: number): "warning" | "critical" | null {
  if (percent >= CRIT_PCT) return "critical"
  if (percent >= WARN_PCT) return "warning"
  return null
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function fmtHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)} hrs`
}

// ─── Main ──────────────────────────────────────────────

export function checkQuota(
  vercel: VercelInput | null,
  upstash: UpstashInput | null,
): QuotaCheckResult {
  const alerts: QuotaAlert[] = []

  // Vercel usage — shape mirrors what /api/admin/vercel-status returns
  if (vercel?.configured && vercel.usage) {
    // Vercel /v1/usage response varies — try common shapes defensively
    const u = vercel.usage as Record<string, { used?: number; limit?: number }>

    if (u.bandwidth) {
      const used = u.bandwidth.used || 0
      const limit = u.bandwidth.limit || 100 * 1024 ** 3 // Hobby = 100 GB
      const p = pct(used, limit)
      const lv = levelOf(p)
      if (lv) {
        alerts.push({
          metric: "Bandwidth",
          used: fmtBytes(used),
          limit: fmtBytes(limit),
          percent: p,
          level: lv,
          recommendations: RECOMMENDATIONS.bandwidth,
        })
      }
    }

    if (u.serverlessFunctionExecution) {
      const used = u.serverlessFunctionExecution.used || 0
      const limit = u.serverlessFunctionExecution.limit || 100 * 3600 // Hobby = 100 GB-Hrs
      const p = pct(used, limit)
      const lv = levelOf(p)
      if (lv) {
        alerts.push({
          metric: "Serverless Function Hours",
          used: fmtHours(used),
          limit: fmtHours(limit),
          percent: p,
          level: lv,
          recommendations: RECOMMENDATIONS.serverless,
        })
      }
    }

    if (u.imageOptimization) {
      const used = u.imageOptimization.used || 0
      const limit = u.imageOptimization.limit || 1000 // Hobby default
      const p = pct(used, limit)
      const lv = levelOf(p)
      if (lv) {
        alerts.push({
          metric: "Image Optimization",
          used: `${used}`,
          limit: `${limit}`,
          percent: p,
          level: lv,
          recommendations: RECOMMENDATIONS.imageOpt,
        })
      }
    }
  }

  // Upstash
  if (upstash?.configured) {
    if (upstash.memory) {
      const p = pct(upstash.memory.used, upstash.memory.limit)
      const lv = levelOf(p)
      if (lv) {
        alerts.push({
          metric: "Upstash Memory",
          used: fmtBytes(upstash.memory.used),
          limit: fmtBytes(upstash.memory.limit),
          percent: p,
          level: lv,
          recommendations: RECOMMENDATIONS.upstashMemory,
        })
      }
    }

    if (upstash.dailyCommands) {
      const p = pct(upstash.dailyCommands.used, upstash.dailyCommands.limit)
      const lv = levelOf(p)
      if (lv) {
        alerts.push({
          metric: "Upstash Daily Commands",
          used: `${upstash.dailyCommands.used}`,
          limit: `${upstash.dailyCommands.limit}`,
          percent: p,
          level: lv,
          recommendations: RECOMMENDATIONS.upstashCommands,
        })
      }
    }
  }

  const status: QuotaStatus = alerts.some((a) => a.level === "critical")
    ? "critical"
    : alerts.some((a) => a.level === "warning")
      ? "warning"
      : "ok"

  return { status, alerts, checkedAt: Date.now() }
}

export { WARN_PCT, CRIT_PCT }
