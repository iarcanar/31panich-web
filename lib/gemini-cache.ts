import { createHash } from "crypto"
import { redis } from "./blob-store"
import { generateText, generateTextWithSearch } from "./gemini"

// ─── Gemini cache layer ─────────────────────────────────
// Wraps generateText / generateTextWithSearch with Redis cache.
// Goal: avoid duplicate Gemini API calls when admin retries the same
// enrich/check action within a short window — saves token quota and
// improves response time on repeat clicks.
//
// IMPORTANT: do NOT use this for /api/ai/chat — chat is dynamic per
// session, contents grow each turn, cache hits would be near zero.

type GeminiContents = Array<{
  role: "user" | "model"
  parts: Array<{ text: string }>
}>

interface CacheOptions {
  /** TTL in seconds (default 300 = 5 min) */
  ttl?: number
  /** Skip cache (force fresh call) */
  noCache?: boolean
  /** Cache key prefix for grouping (default "gen") */
  prefix?: string
}

function buildCacheKey(
  prefix: string,
  systemInstruction: string,
  contents: GeminiContents,
  maxOutputTokens: number,
): string {
  const payload = JSON.stringify({
    s: systemInstruction,
    c: contents,
    m: maxOutputTokens,
    // length prefix prevents collisions between different inputs
    // that happen to hash to the same digest after truncation
    len: systemInstruction.length + JSON.stringify(contents).length,
  })
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 32)
  return `cache:gemini:${prefix}:${hash}`
}

/** Cached version of generateText. Reuses Redis singleton from blob-store.ts */
export async function cachedGenerateText(
  systemInstruction: string,
  contents: GeminiContents,
  maxOutputTokens = 2048,
  opts: CacheOptions = {},
): Promise<string> {
  const { ttl = 300, noCache = false, prefix = "gen" } = opts

  if (noCache || !redis) {
    return generateText(systemInstruction, contents, maxOutputTokens)
  }

  const key = buildCacheKey(prefix, systemInstruction, contents, maxOutputTokens)

  try {
    const cached = await redis.get<string>(key)
    if (cached) return cached
  } catch (err) {
    // Cache read failure → fall through to live call (graceful degradation)
    console.warn(`[gemini-cache] read failed for ${key}:`, err)
  }

  const fresh = await generateText(systemInstruction, contents, maxOutputTokens)

  // Only cache non-empty responses
  if (fresh && fresh.length > 0) {
    try {
      await redis.set(key, fresh, { ex: ttl })
    } catch (err) {
      console.warn(`[gemini-cache] write failed for ${key}:`, err)
    }
  }

  return fresh
}

/** Cached version of generateTextWithSearch. Longer default TTL since
 *  internet search results are stable on short timescales. */
export async function cachedGenerateTextWithSearch(
  systemInstruction: string,
  contents: GeminiContents,
  maxOutputTokens = 1024,
  opts: CacheOptions = {},
): Promise<string> {
  const { ttl = 3600, noCache = false, prefix = "search" } = opts

  if (noCache || !redis) {
    return generateTextWithSearch(systemInstruction, contents, maxOutputTokens)
  }

  const key = buildCacheKey(prefix, systemInstruction, contents, maxOutputTokens)

  try {
    const cached = await redis.get<string>(key)
    if (cached) return cached
  } catch (err) {
    console.warn(`[gemini-cache] read failed for ${key}:`, err)
  }

  const fresh = await generateTextWithSearch(systemInstruction, contents, maxOutputTokens)

  if (fresh && fresh.length > 0) {
    try {
      await redis.set(key, fresh, { ex: ttl })
    } catch (err) {
      console.warn(`[gemini-cache] write failed for ${key}:`, err)
    }
  }

  return fresh
}
