import { NextRequest, NextResponse } from "next/server"
import { generateText } from "@/lib/gemini"
import { createSession, getSession, addToHistory } from "@/lib/ai-session"
import { buildChatContextWithProducts } from "@/lib/ai-products"
import { logChat } from "@/lib/chat-logger"
import { getAiConfig } from "@/lib/ai-config"
import { getRelevantKnowledge } from "@/lib/ai-knowledge"
import { PHONE, LINE_ID, HOURS_TEXT } from "@/lib/store-config"
import { getActiveHoliday, getUpcomingHoliday, type ActiveHoliday } from "@/lib/holidays"

// ─── Helpers ────────────────────────────────────────────

function isStoreOpen(): boolean {
  const now = new Date()
  const bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const minutes = bkk.getHours() * 60 + bkk.getMinutes()
  return minutes >= 450 && minutes < 1050
}

function fmtThai(iso: string): string {
  return new Date(iso + "T00:00:00+07:00").toLocaleDateString("th-TH", { day: "numeric", month: "long" })
}

// ─── Holiday keyword detection ──────────────────────────

const HOLIDAY_KEYWORDS = [
  "หยุด", "วันหยุด", "เทศกาล", "ปีใหม่", "หยุดยาว",
  "กี่โมง", "เปิดกี่", "ปิดกี่", "เปิดวัน", "ปิดวัน",
  "เปิดไหม", "ปิดไหม", "เปิดมั้ย", "ปิดมั้ย",
]

function isHolidayRelated(message: string, holidayObj: ActiveHoliday | null): boolean {
  const allKeywords = [...HOLIDAY_KEYWORDS]
  if (holidayObj) {
    allKeywords.push(holidayObj.name.replace(/\s*\d{4}$/, ""))
  }
  // Normalize Unicode (NFC) to handle Thai tone mark encoding differences
  const normalizedMsg = message.normalize("NFC")
  return allKeywords.some((kw) => normalizedMsg.includes(kw.normalize("NFC")))
}

// ─── Pipeline A: Holiday response (short, focused) ─────

const HOLIDAY_TEMPLATE = `คุณเป็น "สามหนึ่ง Ai" ผู้ช่วยของร้านสามหนึ่งพานิช ร้านวัสดุก่อสร้าง จ.ลพบุรี
คุณเป็นผู้ชาย ใช้คำลงท้ายว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ/คะ/นะคะ"

ข้อมูลสำคัญที่ต้องตอบ:
{HOLIDAY_FACTS}

เวลาปัจจุบัน: {NOW}
เวลาทำการปกติ: {HOURS}

ลูกค้ากำลังถามเรื่องวันหยุดหรือเวลาเปิดปิด ให้ตอบข้อมูลวันหยุดข้างต้นทันที
ตอบสั้นๆ เป็นกันเอง ใส่คำอวยพรท้ายข้อความ ห้ามเปลี่ยนวันที่เด็ดขาด`

function buildHolidayPrompt(now: string, holidayObj: ActiveHoliday, isActive: boolean): string {
  const facts = [
    `ร้าน${isActive ? "หยุด" : "จะหยุด"}${holidayObj.name}`,
    `วันหยุด: ${fmtThai(holidayObj.closedFrom)} ถึง ${fmtThai(holidayObj.closedTo)}`,
    `เปิดทำการ: ${holidayObj.reopenDayName}ที่ ${fmtThai(holidayObj.reopenDate)} เวลา ${HOURS_TEXT}`,
    `คำอวยพร: "${holidayObj.greeting}"`,
  ].join("\n")

  return HOLIDAY_TEMPLATE
    .replace("{NOW}", now)
    .replace("{HOURS}", HOURS_TEXT)
    .replace("{HOLIDAY_FACTS}", facts)
}

// ─── Pipeline B: Normal product response ────────────────

const SYSTEM_TEMPLATE = `คุณเป็น "สามหนึ่ง Ai" ผู้ช่วยของร้านสามหนึ่งพานิช ร้านวัสดุก่อสร้างและอุปกรณ์ช่างครบวงจร จ.ลพบุรี
คุณเป็นผู้ชาย ใช้คำลงท้ายว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ/คะ/นะคะ" โดยเด็ดขาด

{INSTRUCTIONS}

เวลาปัจจุบัน: {NOW}
สถานะร้าน: {STORE_STATUS}

{CONTACT_RULES}

การค้นหาสินค้า (สำคัญมาก — ทำตามลำดับขั้นตอน):
ขั้นตอนที่ 1 — ตรวจสอบก่อนตอบ:
- ดูจากรายการ "สินค้าที่เกี่ยวข้อง" ด้านล่างเท่านั้น ห้ามแต่งชื่อสินค้าขึ้นมาเอง
- ถ้าสินค้าที่ลูกค้าถามไม่ตรงกับชื่อสินค้าในรายการ → {FALLBACK_NO_PRODUCT}
- ตัวอย่าง: ลูกค้าถาม "มีดอกสว่านมั้ย" แต่ในรายการมีแค่ "สว่านแบต" "สว่านโรตารี" → ตอบว่ามีสว่านหลายรุ่น แต่ดอกสว่านแยกชิ้นต้องสอบถามเพิ่ม

ขั้นตอนที่ 2 — เสนอให้ดู (ยังไม่ค้นหา):
- ตอบสบายๆ ว่ามีอะไรบ้าง ยกตัวอย่าง 1-2 ชิ้นจากรายการ
- ถามว่า "อยากดูที่หน้าเว็บมั้ยครับ?" หรือ "ลองดูตัวอย่างก่อนมั้ยครับ?"
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

[ไม่มีในระบบ — ห้ามใช้ SEARCH] สินค้าที่มีขายที่หน้าร้าน แต่ยังไม่มีในระบบออนไลน์:
- สีทาบ้าน — ยี่ห้อ TOA, เบเยอร์ ที่ร้านมีเครื่องผสมสี สั่งผสมเฉดสีได้ รอรับได้เลย → {FALLBACK_OFFLINE_PRODUCT}
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

    // ── Step 1: Keyword detection → route to pipeline ──
    const holidayDetected = isHolidayRelated(message, holidayObj)

    let reply: string
    let searchKeyword: string | undefined

    if (holidayDetected && holidayObj) {
      // ══ Pipeline A: Holiday (มีข้อมูลวันหยุด) ══
      const holidayPrompt = buildHolidayPrompt(now, holidayObj, !!activeHoliday)
      const contents = [
        ...session.history,
        { role: "user" as const, parts: [{ text: message }] },
      ]
      reply = await generateText(holidayPrompt, contents, 512)
      searchKeyword = undefined
    } else if (holidayDetected && !holidayObj) {
      // ══ Pipeline A2: ถามวันหยุด แต่ไม่มีข้อมูล ══
      reply = `ร้านเปิดบริการทุกวัน ${HOURS_TEXT} ครับ\n\nสำหรับวันหยุดเทศกาล ทางร้านจะแจ้งให้ทราบล่วงหน้าผ่านช่องทางโซเชียลมีเดียก่อนถึงวันหยุดนั้นครับ 😊`
      searchKeyword = undefined
    } else {
      // ══ Pipeline B: Normal (products + general) ══
      const { context: productContext } = await buildChatContextWithProducts(message)
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

      const rawReply = await generateText(systemInstruction, contents, 2048)
      const parsed = parseSearchTag(rawReply)
      reply = parsed.cleanReply
      searchKeyword = parsed.searchKeyword
    }

    // Save to history
    addToHistory(sessionId, "user", message)
    addToHistory(sessionId, "model", reply)

    // Log
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : "localhost"
    try { await logChat(ip, message, reply) } catch { /* never break chat */ }

    return NextResponse.json({
      sessionId, reply, isNew,
      searchQuery: searchKeyword,
    })
  } catch {
    return NextResponse.json(
      { error: "ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่" },
      { status: 503 }
    )
  }
}
