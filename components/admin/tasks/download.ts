// เครื่องมือดาวน์โหลดไฟล์แนบสำหรับทีมทำสื่อ — client-side เท่านั้น (ใช้ document/Blob)
//
// ทำไมไม่ใช้ Cloudinary fl_attachment ตั้งชื่อ: ทดสอบแล้ว Cloudinary รับชื่อไฟล์ได้เฉพาะ
// ASCII — ใส่ภาษาไทย (ทั้งดิบและ encode) ตอบ 400 ทันที ชื่องานในระบบนี้เป็นไทยเกือบทั้งหมด
// จึงต้องโหลดเป็น blob แล้วตั้งชื่อฝั่ง browser (res.cloudinary.com ส่ง
// access-control-allow-origin: * มาให้อยู่แล้ว) ถ้า fetch พลาดค่อย fallback ไป fl_attachment
// แบบชื่อ ASCII

import type { TaskAttachment } from "@/types/task"

/** ตัดอักขระที่ตั้งเป็นชื่อไฟล์บน Windows/macOS ไม่ได้ออก แต่คงภาษาไทยไว้ */
function safeFilePart(s: string, max = 40): string {
  return s
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max)
}

/** เวอร์ชัน ASCII ล้วน สำหรับ fallback ผ่าน Cloudinary (ไทยใช้ไม่ได้) */
function asciiFilePart(s: string, max = 40): string {
  const ascii = s.replace(/[^\x20-\x7E]/g, "").trim()
  return safeFilePart(ascii, max)
}

function extOf(a: TaskAttachment): string {
  if (a.format) return a.format
  const m = a.url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)
  return m ? m[1] : "jpg"
}

/**
 * ชื่อไฟล์ที่ทีมทำสื่อจะได้ตอนโหลด — เรียงตามลำดับในใบงานเสมอ
 * `TSK-001_ของแลกแต้ม-กค-2569_01-02.webp`  (รายการที่ 1 รูปที่ 2)
 */
export function attachmentFilename(opts: {
  taskCode: string
  taskTitle: string
  itemIndex: number
  imageIndex: number
  attachment: TaskAttachment
}): string {
  const { taskCode, taskTitle, itemIndex, imageIndex, attachment } = opts
  const title = safeFilePart(taskTitle)
  const seq = `${String(itemIndex + 1).padStart(2, "0")}-${String(imageIndex + 1).padStart(2, "0")}`
  return [taskCode, title, seq].filter(Boolean).join("_") + "." + extOf(attachment)
}

/** URL สำรอง: ให้ Cloudinary ยัด Content-Disposition มาเอง (ชื่อ ASCII เท่านั้น) */
function cloudinaryAttachmentUrl(url: string, asciiName: string): string {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) return url
  const name = asciiFilePart(asciiName)
  return url.replace("/upload/", `/upload/fl_attachment${name ? `:${name}` : ""}/`)
}

function triggerAnchor(href: string, filename?: string) {
  const a = document.createElement("a")
  a.href = href
  if (filename) a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** โหลด 1 ไฟล์พร้อมตั้งชื่อ — คืน true ถ้าได้ชื่อไทยตามที่ตั้ง, false ถ้าต้อง fallback */
export async function downloadOne(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    triggerAnchor(objectUrl, filename)
    // ปล่อยให้ browser เริ่มโหลดก่อนค่อยคืน memory
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    return true
  } catch {
    triggerAnchor(cloudinaryAttachmentUrl(url, filename.replace(/\.[a-z0-9]+$/i, "")))
    return false
  }
}

/**
 * โหลดหลายไฟล์รวดเดียว — ไล่ทีละไฟล์พร้อมเว้นจังหวะ ไม่งั้น browser จะตัดทิ้ง
 * (Chrome ถามอนุญาต "ดาวน์โหลดหลายไฟล์" ครั้งแรกครั้งเดียว)
 */
export async function downloadAll(
  files: { url: string; filename: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    await downloadOne(files[i].url, files[i].filename)
    onProgress?.(i + 1, files.length)
    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 350))
  }
}
