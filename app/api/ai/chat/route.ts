import { NextRequest, NextResponse } from "next/server"
import { generateText } from "@/lib/gemini"
import { createSession, getSession, addToHistory } from "@/lib/ai-session"
import { buildChatContextWithProducts } from "@/lib/ai-products"
import { logChat } from "@/lib/chat-logger"
import { getAiConfig } from "@/lib/ai-config"
import { getRelevantKnowledge } from "@/lib/ai-knowledge"
import { PHONE, LINE_ID, HOURS_TEXT } from "@/lib/store-config"
import { getActiveHoliday, getUpcomingHoliday } from "@/lib/holidays"

/** Check if current Bangkok time is within business hours (07:30-17:30) */
function isStoreOpen(): boolean {
  const now = new Date()
  const bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const minutes = bkk.getHours() * 60 + bkk.getMinutes()
  return minutes >= 450 && minutes < 1050
}

const SYSTEM_TEMPLATE = `คุณเป็น "สามหนึ่ง Ai" ผู้ช่วยของร้านสามหนึ่งพานิช ร้านวัสดุก่อสร้างและอุปกรณ์ช่างครบวงจร จ.ลพบุรี
คุณเป็นผู้ชาย ใช้คำลงท้ายว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ/คะ/นะคะ" โดยเด็ดขาด

{INSTRUCTIONS}

เวลาปัจจุบัน: {NOW}
สถานะร้าน: {STORE_STATUS}
{HOLIDAY_INFO}
- เมื่อลูกค้าถามเรื่องเปิด/ปิดร้าน วันหยุด สงกรานต์ ปีใหม่ หรือเทศกาล → ต้องตอบตามข้อมูล "สถานะร้าน" และ "วันหยุด" ด้านบนเสมอ ห้ามตอบว่า "เปิดทุกวัน" ถ้ามีข้อมูลวันหยุดอยู่
- ห้ามพูดถึงวันหยุดเทศกาลเอง จนกว่าลูกค้าจะถามก่อน

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

/** Extract [SEARCH:keyword] tag from AI reply, return cleaned reply + keyword */
function parseSearchTag(reply: string): { cleanReply: string; searchKeyword?: string } {
  const match = reply.match(/\[SEARCH:([^\]]+)\]/i)
  if (!match) return { cleanReply: reply }
  const keyword = match[1].trim()
  const cleanReply = reply.replace(/\s*\[SEARCH:[^\]]+\]\s*/gi, "").trim()
  if (!keyword || keyword.length < 2) return { cleanReply }
  return { cleanReply, searchKeyword: keyword }
}

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
      if (!existing) sessionId = undefined // expired
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

    // Build product context for AI
    const { context: productContext } = await buildChatContextWithProducts(message)
    const knowledge = getRelevantKnowledge(message)
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "full", timeStyle: "short" })
    const storeOpen = isStoreOpen()
    const { instructions } = await getAiConfig()

    // Holiday check
    const activeHoliday = await getActiveHoliday()
    const upcomingHoliday = !activeHoliday ? await getUpcomingHoliday() : null
    const effectiveOpen = activeHoliday ? false : storeOpen

    // Format ISO date → "12 เมษายน"
    function fmtThai(iso: string) {
      return new Date(iso + "T00:00:00+07:00").toLocaleDateString("th-TH", { day: "numeric", month: "long" })
    }

    // Build time-aware rules
    const storeStatus = activeHoliday
      ? `ปิดวันหยุด${activeHoliday.name} — เปิดทำการ${activeHoliday.reopenDayName}ที่ ${fmtThai(activeHoliday.reopenDate)} เวลา ${HOURS_TEXT}`
      : effectiveOpen
        ? `เปิดอยู่ (ในเวลาทำการ ${HOURS_TEXT})`
        : `ปิดแล้ว (นอกเวลาทำการ — เปิดใหม่พรุ่งนี้ ${HOURS_TEXT})`

    let holidayInfo = ""
    if (activeHoliday) {
      holidayInfo = [
        `★★★ ข้อมูลวันหยุด (ห้ามตอบผิดจากนี้เด็ดขาด):`,
        `- ร้านหยุด${activeHoliday.name}`,
        `- วันหยุด: ${fmtThai(activeHoliday.closedFrom)} ถึง ${fmtThai(activeHoliday.closedTo)} (รวม 5 วัน)`,
        `- วันเปิดทำการ: ${activeHoliday.reopenDayName}ที่ ${fmtThai(activeHoliday.reopenDate)} เวลา ${HOURS_TEXT}`,
        `- คำอวยพร: "${activeHoliday.greeting}"`,
        `- เมื่อลูกค้าถามเรื่องวันหยุด/เปิดปิด/สงกรานต์ → ตอบตามข้อมูลข้างต้นเท่านั้น ห้ามเปลี่ยนวันที่`,
      ].join("\n")
    } else if (upcomingHoliday) {
      holidayInfo = [
        `★★★ วันหยุดใกล้ถึง (ห้ามตอบผิดจากนี้เด็ดขาด):`,
        `- ร้านจะหยุด${upcomingHoliday.name}`,
        `- วันหยุด: ${fmtThai(upcomingHoliday.closedFrom)} ถึง ${fmtThai(upcomingHoliday.closedTo)}`,
        `- วันเปิดทำการ: ${upcomingHoliday.reopenDayName}ที่ ${fmtThai(upcomingHoliday.reopenDate)} เวลา ${HOURS_TEXT}`,
        `- คำอวยพร: "${upcomingHoliday.greeting}"`,
        `- เมื่อลูกค้าถามเรื่องวันหยุด/สงกรานต์/เปิดปิด → แจ้งวันที่ตามข้างต้นเท่านั้น ห้ามเปลี่ยนวันที่`,
      ].join("\n")
    } else {
      holidayInfo = "ไม่มีวันหยุดเทศกาลในช่วงนี้\n- ถ้าลูกค้าถามเรื่องวันหยุด → ตอบว่า \"เราจะแจ้งให้ทราบผ่านช่องทางโซเชียลมีเดียก่อนถึงวันหยุดนั้นครับ\""
    }

    const contactRules = effectiveOpen
      ? `ช่องทางติดต่อ:\n- เขียนแค่ "LINE ${LINE_ID}" หรือ "โทร ${PHONE}" ห้ามใส่ URL ระบบแปลงเป็นลิงก์กดได้เอง`
      : `ช่องทางติดต่อ (${activeHoliday ? "วันหยุด" : "นอกเวลาทำการ"}):\n- ตอบคำถามทั่วไปได้ตามปกติ ไม่ต้องพูดถึงเรื่องเวลาเปิด/ปิด ถ้าลูกค้าไม่ได้ถาม\n- เฉพาะเมื่อต้องส่งต่อพนักงาน (สินค้าไม่มีในระบบ ต้องสอบถามเพิ่ม) → ห้ามแนะนำ LINE ${LINE_ID} หรือโทร ${PHONE} เพราะไม่มีคนตอบ ให้แนะนำมาสอบถามอีกครั้ง${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${activeHoliday.reopenDate}` : "ในเวลาทำการ"}แทน`

    const fallbackNoProduct = effectiveOpen
      ? `บอกตรงๆ ว่าอาจไม่มีในระบบ แนะนำสอบถาม LINE ${LINE_ID}`
      : `บอกว่าสินค้าประเภทนี้ยังไม่มีข้อมูลในระบบ สอบถามเพิ่มเติมได้${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${activeHoliday.reopenDate}` : `ในเวลาทำการ ${HOURS_TEXT}`} ครับ`

    const fallbackOfflineProduct = effectiveOpen
      ? `แนะนำลูกค้าติดต่อ LINE ${LINE_ID} หรือเข้ามาที่หน้าร้านโดยตรง`
      : `สินค้าตัวนี้มีที่หน้าร้าน สอบถามรายละเอียดเพิ่มได้${activeHoliday ? `หลังวันหยุด ${activeHoliday.reopenDayName}ที่ ${activeHoliday.reopenDate}` : `ในเวลาทำการ ${HOURS_TEXT}`} ครับ`

    const systemInstruction = SYSTEM_TEMPLATE
      .replace("{INSTRUCTIONS}", instructions)
      .replace("{PRODUCTS}", productContext + knowledge)
      .replace("{NOW}", now)
      .replace("{STORE_STATUS}", storeStatus)
      .replace("{HOLIDAY_INFO}", holidayInfo)
      .replace("{CONTACT_RULES}", contactRules)
      .replace(/\{FALLBACK_NO_PRODUCT\}/g, fallbackNoProduct)
      .replace(/\{FALLBACK_OFFLINE_PRODUCT\}/g, fallbackOfflineProduct)

    // Build contents with history + new message
    const contents = [
      ...session.history,
      { role: "user" as const, parts: [{ text: message }] },
    ]

    const rawReply = await generateText(systemInstruction, contents, 2048)
    const { cleanReply: reply, searchKeyword } = parseSearchTag(rawReply)

    // Save to history (clean reply without [SEARCH:] tag)
    addToHistory(sessionId, "user", message)
    addToHistory(sessionId, "model", reply)

    // Log for admin analytics
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
