// ─── Task / ใบสั่งงาน ────────────────────────────────────
// ระบบบรีฟงานภายใน: พนักงานหน้าร้าน (manager) สั่งงานให้ทีมทำสื่อ (admin)
// แนบรูปต้นฉบับ + ผูกสินค้าจากฐานข้อมูล + ติดตามสถานะ
// สิทธิ์แบนราบ — manager กับ admin ทำได้เท่ากันทุกอย่างในระบบนี้

export type TaskStatus = "requested" | "in_progress" | "done"
export type TaskType = "points_reward" | "bundle_promo" | "general"
export type TaskPriority = "normal" | "urgent"

/** ไฟล์แนบ — เก็บ Cloudinary secure_url ของ "ต้นฉบับ" (ไม่ย่อ ไม่แปลง format)
 *  เพราะทีมทำสื่อต้องเอาไปรีทัชต่อ ตอนแสดงผลค่อยแทรก transform ผ่าน cldThumb() */
export interface TaskAttachment {
  url: string
  name: string
  width?: number
  height?: number
  bytes?: number
  format?: string
}

/** สินค้าที่แปะเข้าใบงาน — snapshot ไว้ กันสินค้าถูกลบ/แก้ชื่อทีหลัง */
export interface TaskProductRef {
  /** null = สินค้านอกระบบ (พนักงานพิมพ์ชื่อเอง) */
  productId: string | null
  name: string
  sku: string
  image: string
  price: number
  /** "ใช้ 150 แต้ม" / "ราคาชุด 1,290" */
  note?: string
}

/** 1 รายการ = 1 โปรในใบงาน — ย่อ/กางได้ใน UI
 *  สินค้า >= 2 ชิ้นในรายการเดียว = ขายเป็นชุด (use case 2) */
export interface TaskItem {
  id: string
  title: string
  detail: string
  products: TaskProductRef[]
  attachments: TaskAttachment[]
}

export interface TaskComment {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export interface Task {
  id: string
  /** "TSK-004" — ไว้อ้างอิงเวลาคุยกัน */
  code: string
  title: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  /** "2026-08-15" — ไม่บังคับ */
  dueDate?: string
  description: string
  items: TaskItem[]
  comments: TaskComment[]
  createdBy: { id: string; name: string }
  createdAt: string
  updatedAt: string
  /** set เมื่อ status → done, clear เมื่อย้อนกลับ */
  doneAt?: string
}

/** body ที่ client ส่งตอนสร้างใบงาน */
export type TaskInput = Pick<
  Task,
  "title" | "type" | "priority" | "description" | "items"
> & { dueDate?: string }

// ─── ขีดจำกัด (กัน payload Redis บวมจากการเผลอ) ──────────
export const MAX_ITEMS_PER_TASK = 10
export const MAX_ATTACHMENTS_PER_ITEM = 10
export const MAX_ATTACHMENT_MB = 10
