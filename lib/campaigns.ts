import { readJSON, writeJSON } from "./blob-store"

// ─── Special time-limited promo campaigns ───────────────
// โปรพิเศษมีระยะเวลาจำกัด (เช่น มาตรการรัฐ co-payment) — จัดการผ่านหน้า admin
// เหมือนวันหยุดนักขัตฤกษ์: เก็บใน data/campaigns.json → Redis (blob-store)
// แก้/ปิด/ลบได้ที่ Admin: /admin/ai-logs → accordion "โปรพิเศษ / โครงการรัฐ"
//
// ── Plug out ──
//  - กด toggle ปิด หรือเลย endDate → หายเอง (ไม่ต้อง deploy)
//  - ลบรายการในหน้า admin → ถอดถาวร
// คำตอบ AI แก้ได้ที่ฟิลด์ answer · keyword ตรวจจับอยู่ใน CAMPAIGN_KEYWORDS ด้านล่าง

export interface Campaign {
  id: string
  name: string
  active: boolean
  startDate: string // "YYYY-MM-DD" inclusive (เวลา Bangkok)
  endDate: string   // "YYYY-MM-DD" inclusive
  chipLabel: string // ข้อความ chip เริ่มต้นในแชท
  answer: string    // คำตอบ AI แบบ fixed กระชับ (ผู้ชาย ลงท้าย "ครับ")
}

const FILE = "campaigns.json"

// Seed เริ่มต้น — ใช้เมื่อ Redis ยังไม่มีข้อมูล (prod ครั้งแรก) หรือ local ไม่มีไฟล์
// admin บันทึกทับเมื่อใดก็เก็บลง Redis แล้วใช้ค่านั้นแทน
const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "thaichuaythai-plus-2026",
    name: "ไทยช่วยไทย พลัส (60/40)",
    active: true,
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    chipLabel: "ร่วมโครงการไทยช่วยไทยมั้ย?",
    answer: [
      'ร้านสามหนึ่งร่วมโครงการ "ไทยช่วยไทย พลัส (60/40)" แล้วครับ — รัฐช่วยจ่าย 60% เราจ่ายเอง 40% (สูงสุด 200 บาท/วัน) ผ่านแอปเป๋าตัง ถึง 30 ก.ย. 69',
      "ลองคำนวณยอดจ่ายจริงได้ที่แบนเนอร์หน้าแรกเลยครับ",
    ].join("\n"),
  },
]

// คำที่บ่งชี้ว่าลูกค้าถามถึงโครงการ (เลี่ยง "โครงการ" เดี่ยวๆ เพราะชนกับ "โครงการก่อสร้าง")
const CAMPAIGN_KEYWORDS = [
  "ไทยช่วยไทย", "คนละครึ่ง", "60/40", "รัฐช่วย", "ร่วมโครงการ",
  "โครงการรัฐ", "โครงการของรัฐ", "เป๋าตัง", "สิทธิ์รัฐ", "สิทธิรัฐ",
]

// ─── Data access (admin) ────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  return readJSON<Campaign[]>(FILE, DEFAULT_CAMPAIGNS)
}

export async function saveCampaigns(campaigns: Campaign[]): Promise<void> {
  await writeJSON(FILE, campaigns)
}

// ─── Active check (server-side) ─────────────────────────

/** วันที่ Bangkok วันนี้ "YYYY-MM-DD" */
function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

/** โครงการที่กำลัง active วันนี้ (อยู่ในช่วงวันที่ + active) — ไม่มีก็คืน null */
export async function getActiveCampaign(): Promise<Campaign | null> {
  const today = todayBangkok()
  const campaigns = await getCampaigns()
  for (const c of campaigns) {
    if (!c.active) continue
    if (today >= c.startDate && today <= c.endDate) return c
  }
  return null
}

/** ข้อความนี้ถามเกี่ยวกับโครงการหรือไม่ */
export function isCampaignQuery(message: string): boolean {
  const n = message.normalize("NFC")
  return CAMPAIGN_KEYWORDS.some((kw) => n.includes(kw.normalize("NFC")))
}
