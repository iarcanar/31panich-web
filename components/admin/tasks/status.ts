// Shared display meta สำหรับระบบใบสั่งงาน — ใช้ร่วมกันทั้งหน้า list, การ์ด, และ editor
// ห้ามฮาร์ดโค้ดคำไทย/สีสถานะที่อื่น ให้ดึงจากไฟล์นี้จุดเดียว

import type { TaskStatus, TaskType, TaskPriority } from "@/types/task"

// ─── สถานะ ───────────────────────────────────────────────
// UX: ไม่ใช้ segmented control (จิ้มพลาดง่ายบนมือถือ) — ใช้ "ปุ่มเดินหน้าทีละขั้น"
// ปุ่มเดียวบอกชัดว่าทำอะไรต่อ + text link เล็กๆ ไว้ย้อนกลับ

interface StatusMeta {
  /** คำไทยที่แสดงให้ผู้ใช้เห็น */
  label: string
  /** class ของ pill สถานะ */
  pill: string
  /** สถานะถัดไปเมื่อกดปุ่มเดินหน้า — null = จบแล้ว */
  next: TaskStatus | null
  /** label ของปุ่มเดินหน้า (กริยา บอกผลชัด) */
  nextLabel: string | null
  /** class ของปุ่มเดินหน้า — สีตามสถานะปลายทาง */
  nextBtn: string | null
  /** สถานะก่อนหน้า สำหรับ link ย้อนกลับ — null = ย้อนไม่ได้ */
  prev: TaskStatus | null
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  requested: {
    label: "รอทำ",
    pill: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    next: "in_progress",
    nextLabel: "เริ่มทำงานนี้",
    nextBtn: "bg-cyan-600 hover:bg-cyan-500 text-white",
    prev: null,
  },
  in_progress: {
    label: "กำลังทำ",
    pill: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    next: "done",
    nextLabel: "ทำเสร็จแล้ว",
    nextBtn: "bg-emerald-600 hover:bg-emerald-500 text-white",
    prev: "requested",
  },
  done: {
    label: "เสร็จแล้ว",
    pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    next: null,
    nextLabel: null,
    nextBtn: null,
    prev: "in_progress",
  },
}

/** ลำดับที่ใช้แสดง stepper + filter chips */
export const STATUS_ORDER: TaskStatus[] = ["requested", "in_progress", "done"]

// ─── ประเภทงาน ───────────────────────────────────────────
export const TYPE_META: Record<TaskType, { label: string; hint: string; itemPlaceholder: string }> = {
  points_reward: {
    label: "โปรแลกแต้ม",
    hint: "ใส่ชื่อสินค้า + จำนวนแต้มที่ใช้แลก แล้วแนบรูปสินค้า",
    itemPlaceholder: "เช่น เครื่องเจีย EUROX 750W ใช้ 150 แต้ม",
  },
  bundle_promo: {
    label: "ขายคู่",
    hint: "เลือกสินค้าที่จะขายเป็นชุด แล้วใส่ราคาพิเศษในช่องหมายเหตุ",
    itemPlaceholder: "เช่น สีทาบ้าน + แปรงทาสี ขายเป็นชุด",
  },
  general: {
    label: "อื่นๆ",
    hint: "อธิบายงานที่ต้องการ แนบรูปหรือสินค้าประกอบได้",
    itemPlaceholder: "ชื่อรายการ (ไม่บังคับ)",
  },
}

export const TYPE_ORDER: TaskType[] = ["points_reward", "bundle_promo", "general"]

export const PRIORITY_META: Record<TaskPriority, { label: string }> = {
  normal: { label: "ปกติ" },
  urgent: { label: "ด่วน" },
}

// ─── Cloudinary URL helpers ──────────────────────────────
// เราอัปโหลดไฟล์ต้นฉบับแบบไม่แปลงเลย (keepOriginal) เพราะทีมทำสื่อต้องเอาไปรีทัช
// ตอนแสดงผลจึงต้องแทรก transform ลง URL เอง — f_auto สำคัญมาก เพราะ iPhone
// อัปโหลด HEIC มาแล้ว Chrome/Android เปิดไม่ได้ ถ้าไม่แปลงให้

const CLD_UPLOAD = "/upload/"

function isCloudinary(url: string): boolean {
  return url.includes("res.cloudinary.com/") && url.includes(CLD_UPLOAD)
}

/** URL สำหรับแสดง thumbnail — ย่อฝั่งกว้างสุดไม่เกิน w, แปลง format อัตโนมัติ */
export function cldThumb(url: string, w: number): string {
  if (!isCloudinary(url)) return url
  return url.replace(CLD_UPLOAD, `${CLD_UPLOAD}c_limit,w_${w},f_auto,q_auto/`)
}

/** URL สำหรับดาวน์โหลดไฟล์ต้นฉบับ (ความละเอียดเต็ม ไม่แปลงอะไรเลย) */
export function cldOriginal(url: string): string {
  if (!isCloudinary(url)) return url
  return url.replace(CLD_UPLOAD, `${CLD_UPLOAD}fl_attachment/`)
}

// ─── Formatters ──────────────────────────────────────────

/** "2 วันก่อน" / "เมื่อวาน" / "3 ชม.ก่อน" — สั้นๆ สำหรับ meta ในการ์ด */
export function relativeThai(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ""
  const min = Math.floor(diff / 60000)
  if (min < 1) return "เมื่อครู่"
  if (min < 60) return `${min} นาทีก่อน`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ชม.ก่อน`
  const day = Math.floor(hr / 24)
  if (day === 1) return "เมื่อวาน"
  if (day < 30) return `${day} วันก่อน`
  const mo = Math.floor(day / 30)
  return `${mo} เดือนก่อน`
}

/** "15 ส.ค." — วันกำหนดส่งแบบสั้น */
const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export function fmtDueDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]}`
}

/** เลยกำหนดส่งหรือยัง (เทียบแบบวัน ไม่เอาเวลา) */
export function isOverdue(isoDate: string | undefined, status: TaskStatus): boolean {
  if (!isoDate || status === "done") return false
  const due = new Date(isoDate)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

/** ฿1,290 */
export function fmtBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH")}`
}
