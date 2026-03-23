import { NextRequest, NextResponse } from "next/server"
import { generateText, generateTextWithSearch } from "@/lib/gemini"
import { getProductById } from "@/lib/products"
import { buildEnrichContext } from "@/lib/ai-products"

const RESEARCH_INSTRUCTION = `คุณเป็นผู้เชี่ยวชาญค้นหาข้อมูลสินค้าวัสดุก่อสร้างและเครื่องมือช่าง

ค้นหาข้อมูลจากอินเทอร์เน็ตเกี่ยวกับสินค้านี้:
{QUERY}

รวบรวมข้อมูลต่อไปนี้ให้ครบถ้วนที่สุด:
- สเปคทางเทคนิค (วัตต์ โวลท์ ขนาด น้ำหนัก RPM ฯลฯ)
- จุดเด่นและคุณสมบัติหลัก
- การใช้งานที่เหมาะสม
- ข้อควรรู้สำหรับผู้ซื้อ

ตอบเป็นข้อมูลดิบ เน้นข้อเท็จจริง ไม่ต้องจัดรูปแบบสวยงาม ห้ามใช้ markdown`

const CHECK_INSTRUCTION = `คุณเป็นผู้เชี่ยวชาญตรวจสอบและปรับปรุงข้อมูลสินค้าวัสดุก่อสร้าง

ข้อมูลสินค้าปัจจุบัน:
{DATA}

{RESEARCH}

งานของคุณมี 2 ขั้นตอน:

ขั้นตอนที่ 1 - ตรวจสอบ (ไม่ต้องตรวจ tags เพราะระบบเพิ่มอัตโนมัติ):
1. ชื่อสินค้าถูกต้อง สะกดถูก
2. ราคาสมเหตุสมผลสำหรับสินค้าประเภทนี้
3. คำอธิบายครบถ้วน ถูกต้อง มีสเปคที่จำเป็น (วัตต์ โวลท์ ขนาด น้ำหนัก RPM ฯลฯ)
4. มีข้อมูลสำคัญที่ขาดหายไปหรือไม่

ขั้นตอนที่ 2 - เขียนคำอธิบายใหม่ที่ครบถ้วนกว่าเดิม:
ใช้ข้อมูลจากอินเทอร์เน็ตที่ค้นมา รวมกับข้อมูลเดิม เขียนคำอธิบายฉบับปรับปรุง

รูปแบบการเขียน:
- บรรทัดแรก: สรุปจุดเด่นสั้นๆ 1-2 ประโยค (ไม่ต้องใส่สัญลักษณ์นำหน้า)
- หัวข้อย่อย: ใช้ 【】 ครอบ เช่น 【สเปค】 【จุดเด่น】 【การใช้งาน】
- รายการย่อย: ใช้ ✦ นำหน้าแต่ละข้อ
- สินค้าราคาสูง (หลักพัน) หรือเครื่องมือช่าง → เขียนละเอียด มีหัวข้อย่อย
- สินค้าราคาปานกลาง (หลักร้อย) → 3-5 บรรทัด
- สินค้าราคาถูก (ต่ำกว่า 200 บาท) → 1-3 บรรทัด
- ห้ามแต่งสเปคที่ไม่มีในข้อมูลต้นฉบับหรือข้อมูลค้นหา

ตอบในรูปแบบนี้เท่านั้น:
บรรทัดแรก: [STATUS:ok] หรือ [STATUS:warning] หรือ [STATUS:error]
- ok = ข้อมูลเดิมครบถ้วนดีแล้ว (ยังคงเขียนคำอธิบายปรับปรุงให้)
- warning = ขาดข้อมูลสำคัญ ได้เพิ่มเติมให้แล้ว
- error = ข้อมูลผิดพลาด ต้องแก้ไข

บรรทัดที่สอง: [LABEL:สรุปผลสั้นๆ]

ตามด้วยรายละเอียดผลตรวจสอบเป็นข้อๆ สั้นกระชับ (2-5 ข้อ)

จากนั้นต้องมี [SUGGEST] ตามด้วยคำอธิบายสินค้าฉบับปรับปรุงเสมอ
ห้ามใช้ markdown (** หรือ ##) เขียนเป็นข้อความธรรมดา`

const SUGGEST_INSTRUCTION = `คุณเป็นนักเขียนคำอธิบายสินค้าวัสดุก่อสร้างมืออาชีพ

ข้อมูลสินค้า:
{DATA}

ข้อมูลจากการค้นหา:
{RESEARCH}

กฎการเขียน:
- วิเคราะห์สินค้าก่อน: ราคา หมวดหมู่ ความซับซ้อน

รูปแบบการเขียน:
- บรรทัดแรก: สรุปจุดเด่นสั้นๆ 1-2 ประโยค (ไม่ต้องใส่สัญลักษณ์นำหน้า)
- หัวข้อย่อย: ใช้ 【】 ครอบ เช่น 【สเปค】 【จุดเด่น】 【การใช้งาน】
- รายการย่อย: ใช้ ✦ นำหน้าแต่ละข้อ

ตัวอย่าง:
เครื่องขัดกระดาษทรายสายพาน กำลัง 940 วัตต์ สำหรับงานขัดผิวไม้ โลหะ ทนทาน
【สเปค】
✦ กำลังไฟฟ้า: 940 วัตต์
✦ ขนาดกระดาษทราย: 100 x 610 มม.
【จุดเด่น】
✦ มอเตอร์กำลังสูง ขัดวัสดุได้รวดเร็ว
✦ ด้ามจับตามหลักสรีรศาสตร์ ลดความเมื่อยล้า

ขนาดคำอธิบาย:
- สินค้าราคาสูง (หลักพัน) หรือเครื่องมือช่าง/อุปกรณ์ไฟฟ้า → เขียนละเอียด มีหัวข้อย่อย
- สินค้าราคาปานกลาง (หลักร้อย) → 3-5 บรรทัด
- สินค้าราคาถูก (ต่ำกว่า 200 บาท) หรือวัสดุสิ้นเปลือง → 1-3 บรรทัด

ข้อห้าม:
- ห้ามแต่งสเปคที่ไม่มีในข้อมูลต้นฉบับหรือข้อมูลค้นหา
- ห้ามใช้ markdown (** หรือ ##) เขียนเป็นข้อความธรรมดา
- จัดบรรทัดให้อ่านง่าย ขึ้นบรรทัดใหม่เป็นระเบียบ`

/** Parse [STATUS:], [LABEL:], [SUGGEST] tags from check result */
function parseCheckResult(raw: string) {
  const statusMatch = raw.match(/\[STATUS:(ok|warning|error)\]/i)
  const labelMatch = raw.match(/\[LABEL:([^\]]+)\]/i)

  const status = (statusMatch?.[1] || "warning") as "ok" | "warning" | "error"
  const label = labelMatch?.[1]?.trim() || "ตรวจสอบเสร็จแล้ว"

  let findings = raw
    .replace(/\[STATUS:[^\]]+\]\s*/gi, "")
    .replace(/\[LABEL:[^\]]+\]\s*/gi, "")

  let suggestedDescription: string | null = null
  const sugIdx = findings.indexOf("[SUGGEST]")
  if (sugIdx !== -1) {
    suggestedDescription = findings.slice(sugIdx + "[SUGGEST]".length).trim()
    findings = findings.slice(0, sugIdx).trim()
  }

  return { status, label, findings, suggestedDescription }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "ระบบ AI ไม่พร้อมใช้งาน" }, { status: 500 })
    }

    const body = await request.json()
    const { productId, action } = body as { productId: string; action: "check" | "suggest" }

    if (!productId || !["check", "suggest"].includes(action)) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
    }

    const product = getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 })
    }

    const context = buildEnrichContext(product)

    // Layer 1: Research from internet (search by name + brand, skip SKU which is store-specific)
    const searchQuery = `${product.name} ${product.brand || ""}`.trim()
    let research = ""
    try {
      research = await generateTextWithSearch(
        RESEARCH_INSTRUCTION.replace("{QUERY}", searchQuery),
        [{ role: "user" as const, parts: [{ text: `ค้นหาข้อมูลสินค้า: ${searchQuery}` }] }],
        1024
      )
    } catch {
      research = "(ไม่สามารถค้นหาข้อมูลจากอินเทอร์เน็ตได้)"
    }

    if (action === "suggest") {
      // Layer 2: Write description using research + product data
      const systemInstruction = SUGGEST_INSTRUCTION
        .replace("{DATA}", context)
        .replace("{RESEARCH}", research)

      const result = await generateText(
        systemInstruction,
        [{ role: "user" as const, parts: [{ text: "เขียนคำอธิบายสินค้าใหม่" }] }],
        2048
      )

      return NextResponse.json({ result, action })
    } else {
      // Check: evaluate product data with research context
      const researchSection = research
        ? `\nข้อมูลอ้างอิงจากอินเทอร์เน็ต:\n${research}`
        : ""
      const systemInstruction = CHECK_INSTRUCTION
        .replace("{DATA}", context)
        .replace("{RESEARCH}", researchSection)

      const rawResult = await generateText(
        systemInstruction,
        [{ role: "user" as const, parts: [{ text: "ตรวจสอบข้อมูลสินค้านี้และเขียนคำอธิบายปรับปรุง" }] }],
        4096
      )

      const parsed = parseCheckResult(rawResult)

      return NextResponse.json({
        result: parsed.findings,
        status: parsed.status,
        statusLabel: parsed.label,
        suggestedDescription: parsed.suggestedDescription,
        action,
      })
    }
  } catch {
    return NextResponse.json(
      { error: "ระบบขัดข้อง กรุณาลองใหม่" },
      { status: 503 }
    )
  }
}
