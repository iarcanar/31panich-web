#!/usr/bin/env node
// Pull production JSON data from Upstash Redis → web/data/*.json
// Safe: one-way read; dev writes stay local.
//
// Usage (from web/):
//   node scripts/sync-from-redis.mjs
//
// Requires UPSTASH_REDIS_REST_KV_REST_API_URL + _TOKEN in env.
// Reads from .env.production (Vercel pull), .env.development.local, or .env.local.

import fs from "node:fs"
import path from "node:path"

const ENV_FILES = [".env.production", ".env.development.local", ".env.local"]

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return
  const txt = fs.readFileSync(p, "utf8")
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
for (const f of ENV_FILES) loadEnvFile(path.resolve(f))

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token =
  process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN ||
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token) {
  console.error("❌ Missing Upstash credentials. Run: vercel env pull .env.production")
  process.exit(1)
}

const { Redis } = await import("@upstash/redis")
const redis = new Redis({ url, token })

const FILES = [
  "products.json",
  "coupons.json",
  "coupon-claims.json",
  "promotions.json",
  "reviews.json",
  "ai-config.json",
  "holidays.json",
  "chat-logs.json",
]

const dataDir = path.resolve("data")
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

let ok = 0, empty = 0, failed = 0
for (const f of FILES) {
  try {
    const val = await redis.get(`data:${f}`)
    if (val === null || val === undefined) {
      console.log(`  ⚠  ${f.padEnd(22)} → empty in Redis (skipped)`)
      empty++
      continue
    }
    // Upstash returns parsed JSON; write pretty-printed for human diff
    const content = typeof val === "string" ? val : JSON.stringify(val, null, 2)
    fs.writeFileSync(path.join(dataDir, f), content, "utf8")
    const size = fs.statSync(path.join(dataDir, f)).size
    console.log(`  ✓  ${f.padEnd(22)} → ${size.toLocaleString()} bytes`)
    ok++
  } catch (err) {
    console.error(`  ✗  ${f.padEnd(22)} → ${err.message}`)
    failed++
  }
}

console.log(`\nDone. ok=${ok}  empty=${empty}  failed=${failed}`)
console.log("→ Restart dev server to see fresh data (cache is in-memory)")
