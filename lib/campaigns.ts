// ─── Special time-limited promo campaigns ───────────────
// โปรพิเศษที่มีระยะเวลาจำกัด (เช่น มาตรการรัฐ co-payment) — โครงสร้างคล้าย holidays
// แต่เป็น constant sync (ไม่พึ่ง Redis/admin) เพราะเป็น one-off ที่ dev คุมเอง
//
// ── Plug in/out ──
//  - เพิ่ม/แก้/ลบ entry ใน CAMPAIGNS ด้านล่าง
//  - หมดโครงการ → ตั้ง active:false หรือปล่อยให้เลย endDate (date gating ตัดให้เอง)
//  - ลบทิ้งถาวร → เอา entry ออกได้เลย ระบบที่เหลือไม่พัง (getActiveCampaign คืน null)

export interface Campaign {
  id: string
  name: string
  active: boolean
  startDate: string // "YYYY-MM-DD" inclusive (เวลา Bangkok)
  endDate: string   // "YYYY-MM-DD" inclusive
  chipLabel: string // ข้อความ chip เริ่มต้นในแชท
  answer: string    // คำตอบ AI แบบ fixed กระชับ (ผู้ชาย ลงท้าย "ครับ")
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "thaichuaythai-plus-2026",
    name: "ไทยช่วยไทย พลัส (60/40)",
    active: true,
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    chipLabel: "ร่วมโครงการไทยช่วยไทยมั้ย?",
    answer: [
      'ร้านสามหนึ่งเข้าร่วมโครงการ "ไทยช่วยไทย พลัส (60/40)" แล้วครับ',
      "ซื้อของที่ร้าน รัฐช่วยจ่าย 60% เราจ่ายเอง 40% (รัฐช่วยสูงสุด 200 บาท/วัน) ใช้สิทธิ์ผ่านแอปเป๋าตัง ได้ถึง 30 ก.ย. 69 ครับ",
      "ลองคำนวณว่าจ่ายเองเท่าไหร่ได้ที่แบนเนอร์หน้าแรกเว็บเลยครับ",
    ].join("\n"),
  },
]

// คำที่บ่งชี้ว่าลูกค้าถามถึงโครงการ (เลี่ยง "โครงการ" เดี่ยวๆ เพราะชนกับ "โครงการก่อสร้าง")
const CAMPAIGN_KEYWORDS = [
  "ไทยช่วยไทย", "คนละครึ่ง", "60/40", "รัฐช่วย", "ร่วมโครงการ",
  "โครงการรัฐ", "โครงการของรัฐ", "เป๋าตัง", "สิทธิ์รัฐ", "สิทธิรัฐ",
]

/** วันที่ Bangkok วันนี้ "YYYY-MM-DD" */
function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
}

/** โครงการที่กำลัง active วันนี้ (อยู่ในช่วงวันที่ + active) — ไม่มีก็คืน null */
export function getActiveCampaign(): Campaign | null {
  const today = todayBangkok()
  for (const c of CAMPAIGNS) {
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
