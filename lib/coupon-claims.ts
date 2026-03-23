import { readJSON, writeJSON, withLock } from "./blob-store"

// ─── Types ───────────────────────────────────────────────
export interface ClaimRecord {
  id: string            // unique claim ID
  couponId: string
  couponCode: string
  serial: string        // "31-A1", "31-A2", ...
  claimedAt: string     // ISO date
  ip: string            // client IP (anonymized last octet)
  ua: string            // user-agent (truncated)
}

// ─── Data helpers ────────────────────────────────────────
const FILE = "coupon-claims.json"

async function readAll(noCache = false): Promise<ClaimRecord[]> {
  return await readJSON<ClaimRecord[]>(FILE, [], noCache)
}

async function writeAll(claims: ClaimRecord[]): Promise<void> {
  await writeJSON(FILE, claims)
}

// ─── Public API ──────────────────────────────────────────

/** Add a claim record and return the generated serial number.
 *  Always reads fresh from storage (noCache) to prevent duplicate serials. */
export async function addClaim(
  couponId: string,
  couponCode: string,
  serialPrefix: string,
  ip: string,
  ua: string,
): Promise<ClaimRecord> {
  return withLock(FILE, async () => {
    const claims = await readAll(true) // always fresh read

    // Count existing claims for this coupon to determine serial number
    const existingCount = claims.filter((c) => c.couponId === couponId).length
    const serialNum = existingCount + 1
    const serial = `31-${serialPrefix}${serialNum}`

    const record: ClaimRecord = {
      id: crypto.randomUUID(),
      couponId,
      couponCode,
      serial,
      claimedAt: new Date().toISOString(),
      ip: anonymizeIp(ip),
      ua: ua.slice(0, 120),
    }

    claims.push(record)
    await writeAll(claims)
    return record
  })
}

/** Get all claims for a specific coupon */
export async function getClaimsForCoupon(couponId: string): Promise<ClaimRecord[]> {
  return (await readAll()).filter((c) => c.couponId === couponId)
}

/** Get claim count for a specific coupon (from actual records) */
export async function getClaimCount(couponId: string): Promise<number> {
  return (await readAll()).filter((c) => c.couponId === couponId).length
}

/** Get all claims (for admin) */
export async function getAllClaims(): Promise<ClaimRecord[]> {
  return (await readAll()).sort((a, b) => b.claimedAt.localeCompare(a.claimedAt))
}

// ─── Helpers ─────────────────────────────────────────────

/** Anonymize IP: keep first 3 octets, replace last with 'x' */
function anonymizeIp(ip: string): string {
  if (!ip) return "unknown"
  // IPv4: 192.168.1.100 → 192.168.1.x
  const parts = ip.split(".")
  if (parts.length === 4) {
    parts[3] = "x"
    return parts.join(".")
  }
  // IPv6 or other: truncate
  return ip.slice(0, 20) + "…"
}
