import { NextRequest, NextResponse } from "next/server"
import { generateText } from "@/lib/gemini"
import { createSession, getSession, addToHistory } from "@/lib/ai-session"
import { buildChatContextWithProducts } from "@/lib/ai-products"
import { logChat } from "@/lib/chat-logger"
import { getAiConfig } from "@/lib/ai-config"
import { getRelevantKnowledge } from "@/lib/ai-knowledge"
import { PHONE, LINE_ID, HOURS_TEXT, STORE_LANDMARK } from "@/lib/store-config"
import { getActiveHoliday, getUpcomingHoliday, type ActiveHoliday } from "@/lib/holidays"
import { getActiveCampaign, isCampaignQuery } from "@/lib/campaigns"
import { recordError } from "@/lib/error-log"

// ─── Helpers ────────────────────────────────────────────

function isStoreOpen(): boolean {
  const now = new Date()
  const bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const minutes = bkk.getHours() * 60 + bkk.getMinutes()
  return minutes >= 450 && minutes < 1050
}

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]

/** Parse ISO date "YYYY-MM-DD" → Thai text — ไม่ใช้ Date object เพื่อตัด UTC shift บน Vercel */
function fmtThai(iso: string): string {
  const [, m, d] = iso.split("-").map(Number)
  return `${d} ${THAI_MONTHS[m - 1]}`
}

/** Normalize greeting — force male polite particles (AI persona is male) */
function toMalePolite(text: string): string {
  return text.replace(/นะคะ/g, "นะครับ").replace(/ค่ะ/g, "ครับ").replace(/คะ/g, "ครับ")
}

// ─── Time/holiday keyword detection ─────────────────────
// Split into two buckets: words that explicitly reference holidays vs.
// generic "what time do you open" questions. General-hours questions
// should NOT drag holiday context into the reply unless a holiday is
// currently active.

const HOLIDAY_SPECIFIC_KEYWORDS = [
  "หยุด", "วันหยุด", "เทศกาล", "ปีใหม่", "หยุดยาว",
]

const HOURS_GENERAL_KEYWORDS = [
  "กี่โมง", "เปิดกี่", "ปิดกี่", "เปิดวัน", "ปิดวัน",
  "เปิดไหม", "ปิดไหม", "เปิดมั้ย", "ปิดมั้ย",
]

const LOCATION_KEYWORDS = [
  "อยู่ไหน", "อยู่ที่ไหน", "อยู่ตรงไหน", "แถวไหน",
  "ที่อยู่ร้าน", "พิกัดร้าน", "แผนที่", "พิกัด",
  "นำทาง", "ไปร้าน", "ไปยังไง", "เดินทาง",
]

function containsAny(message: string, keywords: string[]): boolean {
  const normalized = message.normalize("NFC")
  return keywords.some((kw) => normalized.includes(kw.normalize("NFC")))
}

/** True iff the message explicitly talks about holidays (not just opening hours). */
function isHolidaySpecific(message: string, holidayObj: ActiveHoliday | null): boolean {
  if (containsAny(message, HOLIDAY_SPECIFIC_KEYWORDS)) return true
  if (holidayObj) {
    const nameCore = holidayObj.name.replace(/\s*\d{4}$/, "")
    if (message.normalize("NFC").includes(nameCore.normalize("NFC"))) return true
  }
  return false
}

/** True for generic "กี่โมง / เปิดไหม" style questions. */
function isHoursGeneral(message: string): boolean {
  return containsAny(message, HOURS_GENERAL_KEYWORDS)
}

/** True when the message is primarily asking where the shop is. Handled by
 *  Pipeline A3 — deterministic reply text so TTS can serve a cached WAV. */
function isLocationQuery(message: string): boolean {
  return containsAny(message, LOCATION_KEYWORDS)
}

// ─── Pipeline C: Instant confirmation (skip Gemini) ─────

/** Strip Thai filler words, then check if the core is a confirmation verb */
const FILLER_RE = /(ตัวอย่าง|รายการ|สินค้า|หน่อย|ก่อน|ครับ|ค่ะ|คะ|นะ|สิ|เลย|ด้วย|ให้ดู|จ้า|จ้ะ|ไหน|มา|ที่)/g
const CONFIRM_CORES = /^(ดู|ขอดู|อยากดู|ลองดู|โชว์|เอา|ได้|โอเค|ตกลง|ส่ง|ok|yes|ขอ)$/i

function isConfirmation(msg: string): boolean {
  if (msg.length > 40) return false
  const core = msg.replace(FILLER_RE, "").trim()
  return CONFIRM_CORES.test(core)
}

/** Extract product keyword from Thai user message by stripping filler words */
function extractProductKeyword(msg: string): string {
  return msg
    .replace(/^(อยากได้|ต้องการ|ขอดู|แนะนำ|สนใจ|อยาก|ขอ|หา|ดู|มี)/, "")
    .replace(/(อะไรบ้าง|รึเปล่า|หรือเปล่า|เท่าไหร่|ให้หน่อย|หน่อยครับ|หน่อยค่ะ|มั้ยครับ|ไหมครับ|หน่อย|มั้ย|มั๊ย|ไหม|บ้าง|ครับ|ค่ะ|คะ|นะ|ด้วย)$/, "")
    .trim()
}

// ─── Pipeline B: Normal product response ────────────────

const SYSTEM_TEMPLATE = `คุณเป็น "สามหนึ่ง Ai" ผู้ช่วยของร้านสามหนึ่งพานิช ร้านวัสดุก่อสร้างและอุปกรณ์ช่างครบวงจร จ.ลพบุรี
คุณเป็นผู้ชาย ใช้คำลงท้ายว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ/คะ/นะคะ" โดยเด็ดขาด

{INSTRUCTIONS}

เวลาปัจจุบัน: {NOW}
สถานะร้าน: {STORE_STATUS}

{CONTACT_RULES}

พิกัดร้าน (เมื่อลูกค้าถามที่อยู่/ไปยังไง/แผนที่/พิกัด/ร้านอยู่ไหน/แถวไหน):
- บอก landmark คร่าวๆเท่านั้น: "${STORE_LANDMARK}" — ห้ามบอกที่อยู่เต็มแบบเลขที่/หมู่/ตำบล
- ตามด้วย "กดเพื่อนำทางได้เลยครับ"
- **ใส่แท็ก [MAP] ท้ายข้อความ** — ระบบจะแสดงเป็นปุ่ม Google Maps ให้อัตโนมัติ
- ตัวอย่าง: "ร้านอยู่${STORE_LANDMARK}ครับ กดเพื่อนำทางได้เลยครับ [MAP]"
- ห้ามใส่ URL หรือพิมพ์ว่า "Google Maps" ในข้อความ ระบบจะแสดงปุ่มให้เอง

ที่จอดรถ (เมื่อลูกค้าถามเรื่องที่จอดรถ/จอดรถได้มั้ย/จอดที่ไหน):
- ตอบว่า: "มีครับ รถมอเตอร์ไซค์และรถยนต์ สามารถจอดที่ด้านข้างของร้านได้เลยครับ"
- ถ้าลูกค้าถามต่อว่าร้านอยู่ไหน ค่อยเพิ่ม [MAP] — คำถามเรื่องจอดอย่างเดียวไม่ต้องใส่

การค้นหาสินค้า (สำคัญมาก — ทำตามลำดับขั้นตอน):
ขั้นตอนที่ 1 — ตรวจสอบก่อนตอบ:
- ดูจากรายการ "สินค้าที่เกี่ยวข้อง" ด้านล่างเท่านั้น ห้ามแต่งชื่อสินค้าขึ้นมาเอง
- ถ้าสินค้าที่ลูกค้าถามไม่ตรงกับชื่อสินค้าในรายการ → {FALLBACK_NO_PRODUCT}
- ตัวอย่าง: ลูกค้าถาม "มีดอกสว่านมั้ย" แต่ในรายการมีแค่ "สว่านแบต" "สว่านโรตารี" → ตอบว่ามีสว่านหลายรุ่น แต่ดอกสว่านแยกชิ้นต้องสอบถามเพิ่ม

ขั้นตอนที่ 2 — เสนอให้ดู (ยังไม่ค้นหา):
- ตอบสบายๆ ว่ามีอะไรบ้าง ยกตัวอย่าง 1-2 ชิ้นจากรายการ
- ถามว่า "อยากดูที่หน้าเว็บมั้ยครับ?" หรือ "ลองดูตัวอย่างก่อนมั้ยครับ?"
- **ใส่แท็ก [SUGGEST:คำค้น] ท้ายข้อความ** — ระบบจะแสดงเป็น "ปุ่มกดทันที" ให้ลูกค้าค้นได้เลยโดยไม่ต้องพิมพ์ตอบ
- คำค้นต้องเป็นชื่อสินค้าหลักที่มีจริงในรายการ เช่น [SUGGEST:สว่าน] [SUGGEST:หลอด LED] [SUGGEST:Makita]
- ห้ามใส่แท็ก [SEARCH:] ในขั้นตอนนี้

ขั้นตอนที่ 3 — ค้นหาเมื่อลูกค้ายืนยัน:
- เมื่อลูกค้าตอบรับ (เช่น "ไหน" "ดูเลย" "ดูหน่อย" "โชว์" "เอา" "ได้เลย" "ขอดู" "ดู" "โอเค" "อยากดู") → ใส่แท็ก [SEARCH:คำค้น] ท้ายข้อความ
- คำค้นต้องเป็นชื่อสินค้าหลักที่มีจริงในรายการ เช่น [SEARCH:สว่าน] [SEARCH:เครื่องเจีย] [SEARCH:หลอด LED] [SEARCH:Makita]
- บอกลูกค้าว่า "ดูสินค้าที่หน้าเว็บได้เลยครับ"

ข้อห้าม:
- ห้ามใส่แท็ก [SEARCH:] ทันทีที่ลูกค้าถามครั้งแรก ต้องรอยืนยันก่อน
- ห้ามใส่แท็กเมื่อถามเรื่องอื่น (เวลาเปิดปิด จัดส่ง คืนสินค้า ทักทาย แต้มสะสม โปรโมชั่น ติดต่อ)
- ห้ามบอกว่า "ไม่สามารถแสดงรูปภาพได้" เพราะระบบแสดงให้เอง

ข้อมูลสินค้าเฉพาะทาง (สำคัญ — แยกชัดเจนว่ามีในระบบหรือไม่):

[มีในระบบออนไลน์] สินค้าที่ค้นหาแสดงบนเว็บได้:
- สีสเปรย์ — สีพ่นงานทั่วไป เช่น พ่นรถมอเตอร์ไซค์ รถยนต์ งาน DIY → มีในระบบ ใช้ [SEARCH:] ได้
- สีทาบ้าน — มีบางรายการในระบบ (TOA, Beger) ใช้ [SEARCH:สีทาบ้าน] ได้ แต่ในเว็บมีแค่บางสินค้า → เสนอให้ดูตัวอย่างในเว็บ + แนะนำติดต่อพนักงานเพื่อสอบถามเฉดสีเฉพาะหรือบริการผสมสี ที่ร้านมีเครื่องผสมสี สั่งผสมเฉดได้เลย

[ไม่มีในระบบ — ห้ามใช้ SEARCH] สินค้าที่มีขายที่หน้าร้าน แต่ยังไม่มีในระบบออนไลน์:
- สีอุตสาหกรรม — สีน้ำมันสำหรับทาเก็บงาน ภายใน-ภายนอก, สีสำหรับใส่กาพ่นสี งานช่างทั่วไป → {FALLBACK_OFFLINE_PRODUCT}

เมื่อลูกค้าถามเรื่องสินค้าที่ "ไม่มีในระบบ":
- บอกว่ามีขายที่หน้าร้าน พร้อมอธิบายสั้นๆ ว่ามีอะไรบ้าง
- {FALLBACK_NO_PRODUCT}
- ห้ามใส่ [SEARCH:] เด็ดขาด เพราะจะค้นไม่เจอ

{PRODUCTS}`

function parseSearchTag(reply: string): { cleanReply: string; searchKeyword?: string } {
  const match = reply.match(/\[SEARCH:([^\]]+)\]/i)
  if (!match) return { cleanReply: reply }
  const keyword = match[1].trim()
  const cleanReply = reply.replace(/\s*\[SEARCH:[^\]]+\]\s*/gi, "").trim()
  if (!keyword || keyword.length < 2) return { cleanReply }
  return { cleanReply, searchKeyword: keyword }
}

/** Step-2 offer tag — emitted by the AI when suggesting products without
 *  running a search yet. The frontend renders it as a one-click button so
 *  the user can confirm instantly instead of typing "ดู/เอา". */
function parseSuggestTag(reply: string): { cleanReply: string; suggestKeyword?: string } {
  const match = reply.match(/\[SUGGEST:([^\]]+)\]/i)
  if (!match) return { cleanReply: reply }
  const keyword = match[1].trim()
  const cleanReply = reply.replace(/\s*\[SUGGEST:[^\]]+\]\s*/gi, "").trim()
  if (!keyword || keyword.length < 2) return { cleanReply }
  return { cleanReply, suggestKeyword: keyword }
}

/** Location tag — emitted when AI describes the shop's location. Frontend
 *  renders a Google Maps button below the bubble so the customer can open
 *  directions with one tap. */
function parseMapTag(reply: string): { cleanReply: string; mapLink: boolean } {
  const hasTag = /\[MAP\]/i.test(reply)
  if (!hasTag) return { cleanReply: reply, mapLink: false }
  const cleanReply = reply.replace(/\s*\[MAP\]\s*/gi, " ").replace(/\s+/g, " ").trim()
  return { cleanReply, mapLink: true }
}

// ─── Main handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "ระบบ AI ไม่พร้อมใช้งาน" }, { status: 500 })
    }

    const body = await request.json()
    const message = String(body.message || "").trim().slice(0, 500)
    if (!message) {
      return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 })
    }

    // Session management
    let sessionId = body.sessionId as string | undefined
    let isNew = false

    if (sessionId) {
      const existing = getSession(sessionId)
      if (!existing) sessionId = undefined
    }

    if (!sessionId) {
      const result = createSession()
      if ("queued" in result) {
        return NextResponse.json(
          { queued: true, message: "ขออภัยครับ ระบบกำลังให้บริการเต็ม กรุณารอสักครู่แล้วลองใหม่" },
          { status: 503 }
        )
      }
      sessionId = result.sessionId
      isNew = true
    }

    const session = getSession(sessionId)!
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "full", timeStyle: "short" })
    const storeOpen = isStoreOpen()

    // Holiday check
    const activeHoliday = await getActiveHoliday()
    const upcomingHoliday = !activeHoliday ? await getUpcomingHoliday() : null
    const holidayObj = activeHoliday || upcomingHoliday

    // Special promo campaign check (โปรพิเศษมีระยะเวลาจำกัด — จัดการที่ admin → campaigns.json)
    const activeCampaign = await getActiveCampaign()

    // ── Step 1: Keyword detection → route to pipeline ──
    const holidaySpecific = isHolidaySpecific(message, holidayObj)
    const hoursGeneral = isHoursGeneral(message)
    const timeRelated = holidaySpecific || hoursGeneral

    let reply = ""
    let searchKeyword: string | undefined
    let suggestKeyword: string | undefined
    let mapLink = false

    // ══ Pipeline C: Instant confirmation — skip Gemini for speed + correct keyword ══
    const msgTrimmed = message.trim()
    if (!timeRelated && session.history.length >= 2 && isConfirmation(msgTrimmed)) {
      for (let i = session.history.length - 1; i >= 0; i--) {
        if (session.history[i].role === "user") {
          const prevMsg = session.history[i].parts[0]?.text || ""
          if (!isConfirmation(prevMsg.trim())) {
            const kw = extractProductKeyword(prevMsg)
            if (kw.length >= 2) {
              reply = "ได้เลยครับ ลองดูรายการสินค้าที่หน้าเว็บได้เลยครับ"
              searchKeyword = kw
              break
            }
          }
        }
      }
    }

    if (reply) {
      // Pipeline C handled — skip to saving
    } else if (holidaySpecific && holidayObj) {
      // ══ Pipeline A: Explicit holiday question + data — fixed string, skip Gemini ══
      const isActive = !!activeHoliday
      const from = fmtThai(holidayObj.closedFrom)
      const to = fmtThai(holidayObj.closedTo)
      const reopen = fmtThai(holidayObj.reopenDate)
      const reopenDay = holidayObj.reopenDayName
      reply = [
        `${isActive ? "ตอนนี้" : "ช่วง"}ร้านสามหนึ่งพานิช${isActive ? "หยุด" : "จะหยุด"}${holidayObj.name} ตั้งแต่วันที่ ${from} ถึง ${to} ครับ`,
        `จะเปิดทำการอีกครั้งวัน${reopenDay}ที่ ${reopen} เวลา ${HOURS_TEXT} ครับ`,
        `\n${toMalePolite(holidayObj.greeting)}`,
      ].join("\n")
      searchKeyword = undefined
    } else if (hoursGeneral && activeHoliday) {
      // ══ Pipeline A (variant): Hours question while shop is actually on holiday ══
      const from = fmtThai(activeHoliday.closedFrom)
      const to = fmtThai(activeHoliday.closedTo)
      const reopen = fmtThai(activeHoliday.reopenDate)
      const reopenDay = activeHoliday.reopenDayName
      reply = [
        `ตอนนี้ร้านสามหนึ่งพานิชหยุด${activeHoliday.name} ตั้งแต่วันที่ ${from} ถึง ${to} ครับ`,
        `จะเปิดทำการอีกครั้งวัน${reopenDay}ที่ ${reopen} เวลา ${HOURS_TEXT} ครับ`,
      ].join("\n")
      searchKeyword = undefined
    } else if (holidaySpecific) {
      // ══ Pipeline A2a: Asked about holidays but none exist ══
      reply = `ตอนนี้ไม่มีวันหยุดพิเศษครับ ร้านเปิดบริการทุกวัน ${HOURS_TEXT} ครับ`
      searchKeyword = undefined
    } else if (hoursGeneral) {
      // ══ Pipeline A2b: Plain hours question — answer hours only, don't volunteer holiday talk ══
      reply = `ร้านเปิดทุกวัน ${HOURS_TEXT} ครับ`
      searchKeyword = undefined
    } else if (isLocationQuery(message)) {
      // ══ Pipeline A3: Location question — deterministic reply + map button
      //     (cacheable TTS: text matches a pre-generated WAV on the CDN) ══
      reply = `ร้านอยู่${STORE_LANDMARK}ครับ กดเพื่อนำทางได้เลยครับ`
      mapLink = true
      searchKeyword = undefined
    } else if (activeCampaign && isCampaignQuery(message)) {
      // ══ Pipeline D: Special promo campaign (ไทยช่วยไทย พลัส ฯลฯ) — fixed concise reply, skip Gemini ══
      reply = activeCampaign.answer
      searchKeyword = undefined
    } else {
      // ══ Pipeline B: Normal (products + general) ══
      // Product context — for short follow-ups ("ดูเลย","ขอดูก่อน"), carry over from previous question
      let { context: productContext } = await buildChatContextWithProducts(message)
      if (message.length <= 30 && session.history.length >= 2) {
        const noMatch = productContext.includes("ไม่พบสินค้าที่ตรงกับคำค้น") || productContext.includes("ไม่เกี่ยวกับสินค้า")
        if (noMatch) {
          for (let i = session.history.length - 1; i >= 0; i--) {
            if (session.history[i].role === "user") {
              const prev = await buildChatContextWithProducts(session.history[i].parts[0]?.text || "")
              if (!prev.context.includes("ไม่พบสินค้า") && !prev.context.includes("ไม่เกี่ยวกับสินค้า")) {
                productContext = prev.context
                break
              }
            }
          }
        }
      }
      const knowledge = getRelevantKnowledge(message)
      const { instructions } = await getAiConfig()
      const effectiveOpen = activeHoliday ? false : storeOpen

      const storeStatus = effectiveOpen
        ? `เปิดอยู่ (ในเวลาทำการ ${HOURS_TEXT})`
        : `ปิดแล้ว (นอกเวลาทำการ — เปิดใหม่พรุ่งนี้ ${HOURS_TEXT})`

      const contactRules = effectiveOpen
        ? `ช่องทางติดต่อ:\n- เขียนแค่ "LINE ${LINE_ID}" หรือ "โทร ${PHONE}" ห้ามใส่ URL ระบบแปลงเป็นลิงก์กดได้เอง`
        : `ช่องทางติดต่อ (${activeHoliday ? "วันหยุด" : "นอกเวลาทำการ"}):\n- ตอบคำถามทั่วไปได้ตามปกติ ไม่ต้องพูดถึงเรื่องเวลาเปิด/ปิด ถ้าลูกค้าไม่ได้ถาม\n- เฉพาะเมื่อต้องส่งต่อพนักงาน → ห้ามแนะนำ LINE ${LINE_ID} หรือโทร ${PHONE} เพราะไม่มีคนตอบ ให้แนะนำมาสอบถามอีกครั้ง${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${fmtThai(activeHoliday.reopenDate)}` : "ในเวลาทำการ"}แทน`

      const fallbackNoProduct = effectiveOpen
        ? `บอกตรงๆ ว่าอาจไม่มีในระบบ แนะนำสอบถาม LINE ${LINE_ID}`
        : `บอกว่าสินค้าประเภทนี้ยังไม่มีข้อมูลในระบบ สอบถามเพิ่มเติมได้${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${fmtThai(activeHoliday.reopenDate)}` : `ในเวลาทำการ ${HOURS_TEXT}`} ครับ`

      const fallbackOfflineProduct = effectiveOpen
        ? `แนะนำลูกค้าติดต่อ LINE ${LINE_ID} หรือเข้ามาที่หน้าร้านโดยตรง`
        : `สินค้าตัวนี้มีที่หน้าร้าน สอบถามรายละเอียดเพิ่มได้${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${fmtThai(activeHoliday.reopenDate)}` : `ในเวลาทำการ ${HOURS_TEXT}`} ครับ`

      const systemInstruction = SYSTEM_TEMPLATE
        .replace("{INSTRUCTIONS}", instructions)
        .replace("{PRODUCTS}", productContext + knowledge)
        .replace("{NOW}", now)
        .replace("{STORE_STATUS}", storeStatus)
        .replace("{CONTACT_RULES}", contactRules)
        .replace(/\{FALLBACK_NO_PRODUCT\}/g, fallbackNoProduct)
        .replace(/\{FALLBACK_OFFLINE_PRODUCT\}/g, fallbackOfflineProduct)

      const contents = [
        ...session.history,
        { role: "user" as const, parts: [{ text: message }] },
      ]

      const rawReply = await generateText(systemInstruction, contents, 4096)
      const parsed = parseSearchTag(rawReply)
      const suggestParsed = parseSuggestTag(parsed.cleanReply)
      const mapParsed = parseMapTag(suggestParsed.cleanReply)
      reply = mapParsed.cleanReply
      searchKeyword = parsed.searchKeyword
      suggestKeyword = suggestParsed.suggestKeyword
      mapLink = mapParsed.mapLink
    }

    // Save to history
    addToHistory(sessionId, "user", message)
    addToHistory(sessionId, "model", reply)

    // Log
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip")
      || "unknown"
    try { await logChat(ip) } catch { /* never break chat */ }

    return NextResponse.json({
      sessionId, reply, isNew,
      searchQuery: searchKeyword,
      suggestion: suggestKeyword ? { keyword: suggestKeyword } : undefined,
      mapLink: mapLink || undefined,
    })
  } catch (err) {
    console.error("[ai/chat] Unhandled error:", err)
    // Surface to /admin/settings — fire-and-forget so logging never breaks chat.
    recordError("/api/ai/chat", err).catch(() => { /* swallow */ })
    return NextResponse.json(
      { error: "ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่" },
      { status: 503 }
    )
  }
}
