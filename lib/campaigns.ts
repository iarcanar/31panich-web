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
  answer: string    // คำตอบสั้น (default) — แค่บอกว่าร้านร่วมโครงการ ลงท้าย "ครับ"
  answerDetail?: string // คำตอบละเอียด — ใช้เมื่อลูกค้าถามรายละเอียด (กี่บาท/เงื่อนไข)
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
    // ⚠ ข้อความนี้ผูกกับ WAV ใน lib/tts-cache.ts — แก้ที่นี่/ที่ admin ต้อง regen เสียงด้วย
    answer: 'ร่วมครับ ร้านสามหนึ่งเข้าร่วม "ไทยช่วยไทย พลัส" แล้ว\nใช้สิทธิ์ผ่านแอปเป๋าตังที่หน้าร้านได้เลยครับ',
    answerDetail: [
      'ร้านสามหนึ่งร่วมโครงการ "ไทยช่วยไทย พลัส (60/40)" ครับ — รัฐช่วยจ่าย 60% เราจ่ายเอง 40% (สูงสุด 200 บาท/วัน) ผ่านแอปเป๋าตัง ถึง 30 ก.ย. 69',
      "ลองคำนวณยอดจ่ายจริงได้ที่แบนเนอร์หน้าแรกเลยครับ",
    ].join("\n"),
  },
]

// คำที่บ่งชี้ว่าลูกค้าถามถึงโครงการ (เลี่ยง "โครงการ" เดี่ยวๆ เพราะชนกับ "โครงการก่อสร้าง")
const CAMPAIGN_KEYWORDS = [
  "ไทยช่วยไทย", "คนละครึ่ง", "60/40", "รัฐช่วย", "ร่วมโครงการ",
  "โครงการรัฐ", "โครงการของรัฐ", "เป๋าตัง", "สิทธิ์รัฐ", "สิทธิรัฐ",
]

// คำที่บ่งชี้ว่าลูกค้าอยากรู้ "รายละเอียด" → ตอบแบบละเอียด แทนคำตอบสั้น
const CAMPAIGN_DETAIL_KEYWORDS = [
  "กี่บาท", "เท่าไหร่", "เท่าไร", "เงื่อนไข", "ยังไง", "อย่างไร",
  "คืออะไร", "รายละเอียด", "สูงสุด", "กี่เปอร์", "เปอร์เซ็น",
  "ถึงเมื่อไหร่", "วันไหน", "คิดยังไง", "ใช้ยังไง",
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

/** ลูกค้าถาม "รายละเอียด" โครงการหรือไม่ (กี่บาท/เงื่อนไข/คิดยังไง) */
export function isCampaignDetailQuery(message: string): boolean {
  const n = message.normalize("NFC")
  return CAMPAIGN_DETAIL_KEYWORDS.some((kw) => n.includes(kw.normalize("NFC")))
}

/** เลือกคำตอบ: ละเอียดเมื่อถามรายละเอียด (และมี answerDetail), ไม่งั้นสั้น */
export function pickCampaignAnswer(c: Campaign, message: string): string {
  if (c.answerDetail && isCampaignDetailQuery(message)) return c.answerDetail
  return c.answer
}
