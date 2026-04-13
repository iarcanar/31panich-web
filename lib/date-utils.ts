// ─── Shared date/holiday formatting utilities ───────────

export const MONTHS_SHORT = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
]

/** Format ISO date "YYYY-MM-DD" → "17 เม.ย." (pure string parse, no Date object) */
export function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

/** Strip year suffix: "สงกรานต์ 2569" → "สงกรานต์" */
export function holidayShortName(name: string): string {
  return name.replace(/\s*\d{4}$/, "")
}
