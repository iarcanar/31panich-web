import { readJSON, writeJSON, withLock } from "./blob-store"

/** A single runtime error record surfaced to the admin dashboard. */
export interface ErrorRecord {
  timestamp: string  // ISO 8601
  route: string      // e.g. "/api/ai/chat"
  message: string    // first 240 chars of the error message
}

const FILE = "runtime-errors.json"
const MAX_ERRORS = 10
const DUPLICATE_WINDOW_MS = 60_000 // collapse identical errors fired within 60s

/** Record one runtime error. Idempotent against rapid duplicates so a single
 *  bad config (e.g. expired API key) doesn't fill the buffer with copies of
 *  the same message. Caller should `.catch()` — never break the request path
 *  on logging failure. */
export async function recordError(route: string, error: unknown): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 240)
  return withLock(FILE, async () => {
    const errors = await readJSON<ErrorRecord[]>(FILE, [], true) // bypass cache for accurate dedup
    const now = Date.now()
    const last = errors[0]
    if (last && last.route === route && last.message === message) {
      const lastTs = Date.parse(last.timestamp)
      if (Number.isFinite(lastTs) && now - lastTs < DUPLICATE_WINDOW_MS) {
        return // dedupe: same error within 60s window — skip the write
      }
    }
    errors.unshift({ timestamp: new Date(now).toISOString(), route, message })
    if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS
    await writeJSON(FILE, errors)
  })
}

export async function getRecentErrors(): Promise<ErrorRecord[]> {
  return readJSON<ErrorRecord[]>(FILE, [])
}

export async function clearRecentErrors(): Promise<void> {
  return withLock(FILE, async () => {
    await writeJSON(FILE, [])
  })
}
