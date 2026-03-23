import { put, list } from "@vercel/blob"
import fs from "fs"
import path from "path"

// ─── Dual-mode storage: Vercel Blob (production) / local fs (dev) ───
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

// Log storage mode on first load (visible in Vercel function logs)
console.log(`[blob-store] mode=${useBlob ? "blob" : "local-fs"}, token=${useBlob ? "set" : "NOT SET"}`)

// In-memory cache with TTL (helps warm serverless instances)
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5_000 // 5 seconds

// Per-file write lock to prevent race conditions within the same instance
const locks = new Map<string, Promise<void>>()

/** Acquire a per-file lock: queues writes so read-modify-write is safe */
export async function withLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any pending write on this file
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

/** Read JSON data from blob (production) or local file (dev) */
export async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  // Check memory cache
  const cached = cache.get(filename)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return structuredClone(cached.data) as T
  }

  if (useBlob) {
    try {
      const { blobs } = await list({ prefix: `data/${filename}`, limit: 1 })
      if (blobs.length > 0) {
        // Use downloadUrl to bypass Vercel CDN cache (url is CDN-cached and can be stale)
        const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          cache.set(filename, { data, ts: Date.now() })
          return structuredClone(data) as T
        }
      }
      // Blob empty → seed from local file (first deploy migration)
      return await seedFromLocal(filename, fallback)
    } catch {
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

/** Write JSON data to blob (production) or local file (dev) */
export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const json = JSON.stringify(data, null, 2)

  if (useBlob) {
    try {
      await put(`data/${filename}`, json, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      })
      // Update cache only after successful write
      cache.set(filename, { data, ts: Date.now() })
    } catch (err) {
      // Invalidate cache on failure so next read fetches fresh data
      cache.delete(filename)
      console.error(`[blob-store] writeJSON FAILED for ${filename}:`, err)
      throw new Error(`Blob write failed for ${filename}: ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    const fp = localPath(filename)
    const dir = path.dirname(fp)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fp, json, "utf-8")
    cache.set(filename, { data, ts: Date.now() })
  }
}

/** Upload binary file (images) to blob or local fs */
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

/** Seed blob from local git-committed file (one-time migration) */
async function seedFromLocal<T>(filename: string, fallback: T): Promise<T> {
  try {
    const fp = localPath(filename)
    if (!fs.existsSync(fp)) return fallback
    const raw = fs.readFileSync(fp, "utf-8")
    const data = JSON.parse(raw)
    // Upload to blob for future reads
    await put(`data/${filename}`, raw, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    })
    cache.set(filename, { data, ts: Date.now() })
    return structuredClone(data) as T
  } catch {
    return fallback
  }
}

export { useBlob }
