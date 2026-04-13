import { readJSON, writeJSON } from "./blob-store"

// ─── Types ──────────────────────────────────────────────
export interface Holiday {
  id: string
  name: string            // e.g. "สงกรานต์ 2569"
  closedFrom: string      // ISO date "YYYY-MM-DD"
  closedTo: string        // ISO date "YYYY-MM-DD"
  reopenDate: string      // ISO date "YYYY-MM-DD"
  greeting: string        // คำอวยพรสั้นๆ
  active: boolean
}

/** Info returned to frontend when a holiday is currently active */
export interface ActiveHoliday {
  name: string
  closedFrom: string
  closedTo: string
  reopenDate: string
  reopenDayName: string   // e.g. "วันศุกร์"
  greeting: string
}

const FILE = "holidays.json"

const THAI_DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"]

// ─── Data access ────────────────────────────────────────

export async function getHolidays(): Promise<Holiday[]> {
  return readJSON<Holiday[]>(FILE, [])
}

export async function saveHolidays(holidays: Holiday[]): Promise<void> {
  await writeJSON(FILE, holidays)
}

// ─── Thai day name helper ───────────────────────────────

/** Get Thai day name from ISO date string — parse directly to avoid UTC shift on Vercel */
export function thaiDayName(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return THAI_DAYS[date.getUTCDay()] || ""
}

// ─── Holiday check (server-side) ────────────────────────

/** Get current Bangkok date as "YYYY-MM-DD" */
function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

/** Check if today (Bangkok time) falls within any active holiday's closed period */
export async function getActiveHoliday(): Promise<ActiveHoliday | null> {
  const today = todayBangkok()
  const holidays = await getHolidays()

  for (const h of holidays) {
    if (!h.active) continue
    if (today >= h.closedFrom && today <= h.closedTo) {
      return {
        name: h.name,
        closedFrom: h.closedFrom,
        closedTo: h.closedTo,
        reopenDate: h.reopenDate,
        reopenDayName: thaiDayName(h.reopenDate),
        greeting: h.greeting,
      }
    }
  }
  return null
}

/** Check if a holiday is upcoming (within 3 days) — for AI context */
export async function getUpcomingHoliday(): Promise<ActiveHoliday | null> {
  const today = todayBangkok()
  const holidays = await getHolidays()

  // 3 days from now
  const soon = new Date(today + "T00:00:00+07:00")
  soon.setDate(soon.getDate() + 3)
  const soonStr = soon.toISOString().split("T")[0]

  for (const h of holidays) {
    if (!h.active) continue
    // Already in holiday period — handled by getActiveHoliday
    if (today >= h.closedFrom && today <= h.closedTo) continue
    // Upcoming within 3 days
    if (h.closedFrom > today && h.closedFrom <= soonStr) {
      return {
        name: h.name,
        closedFrom: h.closedFrom,
        closedTo: h.closedTo,
        reopenDate: h.reopenDate,
        reopenDayName: thaiDayName(h.reopenDate),
        greeting: h.greeting,
      }
    }
  }
  return null
}

/** Server-side: is the store closed for a holiday right now? */
export async function isHolidayClosed(): Promise<boolean> {
  return (await getActiveHoliday()) !== null
}
