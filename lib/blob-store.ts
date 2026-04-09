import { Redis } from "@upstash/redis"
import { put } from "@vercel/blob"
import fs from "fs"
import path from "path"

// ─── Storage modes ──────────────────────────────────────
// JSON data → Upstash Redis (free: 10,000 commands/day)
// Images    → Vercel Blob (only for binary uploads)
// Dev       → local filesystem

const redisUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const useRedis = !!redisUrl
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

const redis = useRedis
  ? new Redis({
      url: redisUrl!,
      token: redisToken!,
    })
  : null

console.log(`[blob-store] mode=${useRedis ? "redis" : useBlob ? "blob(legacy)" : "local-fs"}`)

// In-memory cache with TTL (helps warm serverless instances)
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 300_000 // 5 minutes (ลด Redis calls สำหรับข้อมูลที่เปลี่ยนไม่บ่อย)

// Per-file write lock to prevent race conditions within the same instance
const locks = new Map<string, Promise<void>>()

/** Acquire a per-file lock: queues writes so read-modify-write is safe */
export async function withLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(filename) ?? Promise.resolve()
  let release: () => void
  const next = new Promise<void>((res) => { release = res })
  locks.set(filename, next)
  try {
    await prev
    return await fn()
  } finally {
    release!()
    if (locks.get(filename) === next) locks.delete(filename)
  }
}

function localPath(filename: string): string {
  return path.join(process.cwd(), "data", filename)
}

/** Redis key for a data file */
function redisKey(filename: string): string {
  return `data:${filename}`
}

/** Read JSON data — Redis (production) / local file (dev)
 *  @param noCache — bypass in-memory cache, always read fresh */
export async function readJSON<T>(filename: string, fallback: T, noCache = false): Promise<T> {
  // Check memory cache
  if (!noCache) {
    const cached = cache.get(filename)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return structuredClone(cached.data) as T
    }
  }

  if (useRedis && redis) {
    try {
      const data = await redis.get<T>(redisKey(filename))
      if (data !== null && data !== undefined) {
        cache.set(filename, { data, ts: Date.now() })
        return structuredClone(data) as T
      }
      // Redis empty → seed from local file (first deploy migration)
      return await seedFromLocal(filename, fallback)
    } catch (err) {
      console.error(`[blob-store] Redis read FAILED for ${filename}:`, err)
      return fallback
    }
  } else {
    // Local fs (development)
    try {
      const fp = localPath(filename)
      if (!fs.existsSync(fp)) return fallback
      const raw = fs.readFileSync(fp, "utf-8")
      const data = JSON.parse(raw)
      cache.set(filename, { data, ts: Date.now() })
      return structuredClone(data) as T
    } catch {
      return fallback
    }
  }
}

/** Write JSON data — Redis (production) / local file (dev) */
export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  if (useRedis && redis) {
    try {
      await redis.set(redisKey(filename), data)
      cache.set(filename, { data, ts: Date.now() })
    } catch (err) {
      cache.delete(filename)
      console.error(`[blob-store] Redis write FAILED for ${filename}:`, err)
      throw new Error(`Redis write failed for ${filename}: ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    const json = JSON.stringify(data, null, 2)
    const fp = localPath(filename)
    const dir = path.dirname(fp)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fp, json, "utf-8")
    cache.set(filename, { data, ts: Date.now() })
  }
}

/** Upload binary file (images) — still uses Vercel Blob or local fs */
export async function writeFile(
  filepath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (useBlob) {
    const blob = await put(filepath, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    })
    return blob.url
  } else {
    const fp = path.join(process.cwd(), "public", filepath)
    const dir = path.dirname(fp)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fp, buffer)
    return `/${filepath}`
  }
}

/** Seed Redis from local git-committed file (one-time migration) */
async function seedFromLocal<T>(filename: string, fallback: T): Promise<T> {
  try {
    const fp = localPath(filename)
    if (!fs.existsSync(fp)) return fallback
    const raw = fs.readFileSync(fp, "utf-8")
    const data = JSON.parse(raw)
    // Upload to Redis for future reads
    if (useRedis && redis) {
      await redis.set(redisKey(filename), data)
    }
    cache.set(filename, { data, ts: Date.now() })
    return structuredClone(data) as T
  } catch {
    return fallback
  }
}

export { useBlob, useRedis, redis }
