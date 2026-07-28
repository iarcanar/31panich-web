---
title: ระบบใบสั่งงาน (Task Board)
last_reviewed: 2026-07-28
audience: both
---

# ระบบใบสั่งงาน — `/admin/tasks`

ช่องทางให้**พนักงานหน้าร้าน** สั่งงานให้ **ทีมทำสื่อ (พี่ธี)** — วางบรีฟ แนบรูปต้นฉบับ ผูกสินค้าจากฐานข้อมูล และติดตามสถานะ แทนการส่งไฟล์ Word + รูปกระจัดกระจายทาง LINE

เพิ่มเมื่อ 2026-07-28 (adminVersion 1.10.0) · ปรับ UI ใหญ่หลังใช้จริง 1.11.0

> **ระบบนี้ไม่กระทบหน้าเว็บลูกค้าเลย** — เป็นเครื่องมือทำงานภายในล้วน ห้ามใส่ `revalidatePath()` ใน task API

---

## 1. งานสองแบบที่ระบบนี้ถูกออกแบบมารองรับ

| แบบ | หน้าตาข้อมูล | ตัวอย่างจริง |
|---|---|---|
| **โปรแลกแต้ม** (`points_reward`) | 1 การ์ด = 1 ของรางวัล · สินค้า 1 ตัว + จำนวนแต้ม + รูปต้นฉบับ | "เครื่องเจีย EUROX 750W ใช้ 150 แต้ม" ×3 การ์ด |
| **ขายคู่** (`bundle_promo`) | 1 การ์ด = 1 ชุด · สินค้า **≥2 ตัวจากฐานข้อมูล** + ราคาพิเศษ | "สีเบเยอร์ + ลูกกลิ้ง ราคาชุด 1,290" |
| **อื่นๆ** (`general`) | บรีฟอิสระ · ชื่อเรื่อง + รายละเอียด + รูป/สินค้าประกอบ | "ทำป้ายเปิดร้านปีใหม่" |

ประเภทงานเลือกที่หัวฟอร์ม แล้ว**คำใบ้/placeholder ทั้งการ์ดเปลี่ยนตาม** (จาก `TYPE_META`)

---

## 2. โครงข้อมูล

`web/types/task.ts` — โครงเดียวรองรับทั้ง 3 แบบ

```
Task                        1 ใบงาน
├─ code                     "TSK-001" — เลข max ที่มีอยู่ + 1 (ห้าม length+1)
├─ title, type, priority, dueDate
├─ status                   requested → in_progress → done
├─ description              ⚠ legacy เท่านั้น (ดู §6)
├─ items[]                  ≤10 — "การ์ด" 1 ใบ = 1 โปร
│   ├─ title                auto-derive จากชื่อสินค้า ถ้าไม่พิมพ์เอง
│   ├─ detail
│   ├─ products[]           TaskProductRef — snapshot ไว้กันสินค้าถูกลบ/แก้ชื่อ
│   └─ attachments[]        ≤10 — Cloudinary secure_url ของ "ต้นฉบับ"
├─ comments[]               append-only ("คุยงาน")
├─ createdBy                { id, name }
├─ createdAt / updatedAt / doneAt
```

**เก็บที่ไหน**: `data/tasks.json` (dev) → Redis key `data:tasks.json` (production) ผ่าน `lib/blob-store.ts`
**อ่าน/เขียน**: `lib/tasks.ts` (ลอกโครงมาจาก `lib/reels.ts` — `readJSON`/`writeJSON`/`withLock`)

---

## 3. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `types/task.ts` | โครงข้อมูล + ขีดจำกัด (`MAX_ITEMS_PER_TASK`, `MAX_ATTACHMENTS_PER_ITEM`, `MAX_ATTACHMENT_MB`) |
| `lib/tasks.ts` | CRUD + gen `code` + จัดการ `doneAt` + `collectAttachmentUrls()` |
| `app/api/admin/tasks/route.ts` | `GET` (list · `?count=1` → `{open}`) · `POST` |
| `app/api/admin/tasks/[id]/route.ts` | `PUT` (partial) · `DELETE` |
| `app/api/admin/tasks/[id]/comments/route.ts` | `POST` เพิ่มความเห็น |
| `app/api/admin/product-search/route.ts` | ค้นสินค้า → คืน 6 field × max 20 |
| `app/admin/tasks/page.tsx` | หน้า list + filter chips + จัดการ state |
| `components/admin/tasks/TaskCard.tsx` | การ์ดใบงาน (ย่อ/กาง) + ปุ่มสถานะ + คุยงาน + **เครื่องมือทีมทำสื่อ** |
| `components/admin/tasks/TaskEditor.tsx` | ฟอร์มสั่งงาน (modal เต็มจอบนมือถือ) |
| `components/admin/tasks/TaskItemEditor.tsx` | การ์ด 1 ใบในฟอร์ม |
| `components/admin/tasks/TaskProductPicker.tsx` | ค้นหา+แปะสินค้า + กรอบ "ขายเป็นชุด" |
| `components/admin/tasks/TaskAttachmentUploader.tsx` | อัปโหลดรูปต้นฉบับ (XHR + progress) |
| **`components/admin/tasks/status.ts`** | **แหล่งเดียว**ของคำไทย + สีสถานะ + `TYPE_META` + `cldThumb`/`cldOriginal` |
| **`components/admin/tasks/download.ts`** | ตั้งชื่อไฟล์ + ดาวน์โหลด (client-only) |

---

## 4. สิทธิ์ — **แบนราบโดยตั้งใจ**

manager (พนักงาน) กับ admin (พี่ธี) **ทำได้เท่ากันทุกอย่าง รวมถึงลบใบงาน**

ต่างจากส่วนอื่นของ admin ที่ manager ลบคูปอง/reel ไม่ได้ — เป็นการตัดสินใจของเจ้าของ ("คนที่วาง task ได้ให้ admin ทุกระดับทำได้หมดเลย")

- ทุก route เช็กแค่ `getSessionUser()` → 401 ถ้าไม่ login
- **`lib/auth.ts` ไม่ถูกแตะเลย** — ห้ามเผลอเติม `canPerform`/`isAdmin` เพราะเห็นว่า "ไม่สม่ำเสมอกับหน้าอื่น"
- `createdBy` บันทึกไว้เพื่อให้รู้ว่าใครสั่ง ไม่ได้ใช้จำกัดสิทธิ์

---

## 5. รูปแนบ — ต้องเป็นต้นฉบับเสมอ

ทีมทำสื่อต้องเอารูปไปรีทัชต่อ ระบบจึงเก็บไฟล์ที่พนักงานอัปโหลด **ตามเดิมทุกพิกเซล**

### ตอนอัปโหลด
```ts
POST /api/upload/sign  { folder: "tasks", resourceType: "image", keepOriginal: true }
```
- `keepOriginal: true` → sign route **ข้ามการบังคับ `format=webp`**
- **ห้ามส่ง `transformation`** — ไม่งั้น Cloudinary ย่อให้
- ⚠ **ผลข้างเคียงที่ทำให้อัปโหลดพังทั้งหมดถ้าพลาด**: เมื่อไม่มี `format` ใน signed params แล้ว client **ต้อง append `format` เฉพาะเมื่อ `sign.format` มีค่า** — ถ้า append `"undefined"` เข้าไป signature จะ mismatch

### ตอนแสดงผล
ใช้ `cldThumb(url, w)` เท่านั้น — **ต้องมี `f_auto` เสมอ** เพราะเก็บต้นฉบับ ทำให้รูปจาก iPhone เป็น HEIC ที่ Chrome/Android เปิดไม่ขึ้น
**ห้ามใช้ `next/image`** กับรูปแนบและรูปสินค้าในหน้านี้ — กัน quota image-opt ของ Vercel (5,000/เดือน)

### ตอนลบ
`destroyCloudinaryAsset()` จาก `lib/cloudinary-delete.ts` — ดู §6 ข้อ 2

---

## 6. กับดัก 4 ข้อที่ต้องรู้ก่อนแก้โค้ดนี้

### 1. `PUT` ต้อง ignore field ระบบเสมอ
`updateTask()` strip `comments, code, createdBy, createdAt, id` ออกจาก patch ก่อน merge
**ถ้าไม่ strip**: คนที่เปิดฟอร์มแก้ไขค้างไว้ 10 นาทีแล้วกดบันทึก จะเซฟทับคอมเมนต์ที่อีกฝ่ายเพิ่งโพสต์หายไป

### 2. `PUT` destroy รูปเฉพาะเมื่อ body มี key `items`
```ts
const hasItems = Object.prototype.hasOwnProperty.call(body, "items")
```
**ถ้า diff ทุกครั้ง**: การกดปุ่มเปลี่ยนสถานะ (ส่งแค่ `{status}`) จะถูกมองว่ารูปหายหมด → **ลบไฟล์ทิ้งทั้งใบถาวร**
→ ฝั่ง UI ก็ต้องระวัง: `TaskCard` ส่ง `{status}` เดี่ยวๆ เท่านั้น **ห้ามพ่วง `items` ไปด้วย**

### 3. `description` ระดับใบงานถูกเลิกใช้ (แต่ยังไม่ลบ)
เจ้าของร้านใช้จริงแล้วพิมพ์รายการสินค้าทั้งหมดลงช่องนี้ แล้วทิ้งการ์ดว่าง — ช่อง free-text ใหญ่ช่องแรกดูดทุกอย่างเข้าไป
- ฟอร์ม**สร้างใหม่**ไม่มีช่องนี้แล้ว (ส่ง `description: ""`)
- โหมด**แก้ไข**ยังโชว์ เฉพาะใบเก่าที่มีข้อความอยู่ (label "รายละเอียดงาน (ของเดิม)")
- `TaskCard` แสดงแบบมีเงื่อนไขอยู่แล้ว → **ใบเก่าไม่ต้อง migrate**
- ⚠ **ห้ามเอาช่องนี้กลับมาในฟอร์มสร้างใหม่** ปัญหาจะกลับมาทันที

### 4. ทดสอบบน dev อาจเห็นค่าเก่า
`blob-store` cache 30 วินาที (ตั้งใจ — ดู [`debugging.md`](./debugging.md)) และตอน dev hot-reload module จะถูกโคลน ทำให้ route หนึ่งเขียนแล้วอีก route อ่านค่าเก่า
→ **ถ้าเทสต์ API แล้วตกแบบแปลกๆ ให้รีสตาร์ท dev แล้วเทสต์ใหม่ก่อนสรุปว่าเป็นบั๊ก** และเช็ค `data/tasks.json` บนดิสก์ว่าข้อมูลจริงถูกต้องไหม

---

## 7. เครื่องมือทีมทำสื่อ (`download.ts`)

แถบสีเขียวเทา (teal) ในใบงานที่กางอยู่ — แยกจากปุ่ม แก้ไข/ลบ เพื่อสื่อว่าเป็น "เครื่องมือ" ไม่ใช่การกระทำที่เปลี่ยนข้อมูล

| ปุ่ม | ทำอะไร |
|---|---|
| โหลดรูปทั้งหมด (N รูป) | โหลดทุกรูปในใบงาน ไล่ทีละไฟล์เว้นจังหวะ 350ms |
| โหลด N รูป (ในหัวรายการ) | เฉพาะรายการนั้น |
| โหลดต้นฉบับ (ใต้รูป) | ทีละใบ |
| คัดลอกบรีฟ | คัดลอกทั้งใบเป็นข้อความไปวางใน Photoshop/LINE |

### ชื่อไฟล์
```
TSK-001_ของแลกแต้ม-กค-2569_01-02.webp
 └code   └ชื่องาน                └รายการที่ 1, รูปที่ 2
```
เลข zero-pad เพื่อให้เรียงถูกใน File Explorer

### ⚠ ทำไมไม่ใช้ Cloudinary `fl_attachment` ตั้งชื่อ
**ทดสอบแล้ว: Cloudinary รับชื่อไฟล์ได้เฉพาะ ASCII** — ใส่ภาษาไทย (ทั้งดิบและ URL-encode) ตอบ **400** ทันที ชื่องานในระบบนี้เป็นไทยเกือบทั้งหมด
→ จึง `fetch` เป็น blob แล้วตั้งชื่อฝั่ง browser (`res.cloudinary.com` ส่ง `access-control-allow-origin: *` มาให้อยู่แล้ว)
→ ถ้า fetch พลาด fallback ไป `fl_attachment` แบบชื่อ ASCII อัตโนมัติ

`download.ts` เป็น **client-only** (ใช้ `document`/`Blob`) — ห้าม import จาก server component หรือ `lib/`

---

## 8. UI — หลักที่ยึด

### ฟอร์ม (หลังปรับตาม feedback ใช้จริง)
- **การ์ดเป็นหน่วยเดียวที่กรอกข้อมูล** ไม่มีช่อง free-text ระดับใบงานมาแย่ง
- ลำดับในการ์ดตรงลำดับความคิดคนกรอก: **สินค้า → แต้ม/ราคา → รูป → รายละเอียด (ยุบไว้)**
- การ์ดกางอยู่เสมอ ไม่ต้องกดก่อนถึงจะกรอกได้
- ฟอร์มสร้างใหม่ seed การ์ดที่ 1 มาให้เลย

### สีตามขั้น (แก้ปัญหา "ดูแล้วเท่ากันไปหมด")
พื้นหลังคงโทนเดิม 3 ระดับ (`#13131d` modal → `#1a1a28` การ์ด) — **สีโผล่แค่ขอบซ้าย + chip เลขขั้น + สีหัวข้อ ไม่ทาสีพื้น**

| ส่วน | สี |
|---|---|
| ขั้น ① ข้อมูลงาน | `sky-400/60` ขอบซ้าย · หัวข้อ `sky-300` |
| ขั้น ② รายการ + การ์ด | `teal-400/60` ขอบซ้าย · หัวข้อ/chip `teal-300` |
| เครื่องมือทีมทำสื่อ | teal (สื่อว่าเป็นเครื่องมือ) |
| กรอบ "ขายเป็นชุด" | `violet` — **จองไว้แล้ว ห้ามใช้ที่อื่น** |
| ปุ่มเลือกอยู่ / ปุ่มส่งใบงาน | `amber` |
| ด่วน / ลบ | `red` |
| สถานะ รอทำ/กำลังทำ/เสร็จแล้ว | `amber` / `cyan` / `emerald` (อยู่ใน `STATUS_META`) |

**ทั้งฟอร์มมีปุ่มทึบสีส้มปุ่มเดียวคือ "ส่งใบงาน"** — ปุ่มอื่นเป็น secondary หมด ไม่งั้นแย่งความเด่นกันเอง

### คำไทยที่ใช้ (ห้ามคิดคำใหม่ — ดึงจาก `status.ts`)
ใบงาน / สั่งงาน / รอทำ / กำลังทำ / เสร็จแล้ว / เริ่มทำงานนี้ / ทำเสร็จแล้ว / คุยงาน
**ห้ามใช้**: บรีฟ, task, อยู่ระหว่างผลิต, SKU (เดี่ยวๆ), สินค้านอกระบบ

### ปุ่มต้องบอกสถานะจริง
`+ แนบรูปของการ์ดนี้` → `+ เพิ่มรูปอีก (3/10)` → `รอรูปอัปเสร็จ...` → `ครบ 10 รูปแล้ว — ลบรูปที่ไม่ใช้ก่อนจึงเพิ่มได้`
ปุ่มบันทึกที่กดไม่ได้ต้องบอกเหตุผลเสมอ ห้าม disable เงียบๆ

### มือถือ (บังคับ)
input/textarea ทุกช่อง `text-base md:text-sm` (iOS ต่ำกว่า 16px จะ auto-zoom) · ปุ่ม ≥36px · แถวกด ≥44px · `whitespace-nowrap` กับ chip/วลีไทยสั้น (ไทยตัดคำกลางคำบนเครื่องจริงแม้ DevTools ไม่โชว์) · `min-w-0 truncate` กัน overflow

---

## 9. Quota

| จุด | ต้นทุน | มาตรการ |
|---|---|---|
| โหลดหน้า tasks | 1 Redis GET | cache 30s + `unstable_cache` 60s ที่มีอยู่แล้ว |
| บันทึก | 1 Redis SET | mutation คืน `Task` เต็มใบ → client อัปเดต state ตรงๆ **ไม่ refetch list** |
| ค้นหาสินค้า | 0 เพิ่ม | อ่าน `products.json` ผ่าน cache + debounce 300ms + AbortController |
| badge งานค้าง | 1 invocation/หน้า | `?count=1` payload เล็ก + sessionStorage 5 นาที · fetch ครั้งเดียวตอน mount **ไม่ผูกกับ pathname** |
| รูป | **0 Vercel image-opt** | `<img>` + Cloudinary transform |
| polling | **ไม่มี** | refresh ด้วยมือ / หลัง mutation เท่านั้น |

---

## 10. วิธีทดสอบ

```bash
cd c:/31-Site/web
npx next build          # ต้องผ่านก่อน push เสมอ
npm run dev             # แล้วเปิด http://localhost:3000/admin/tasks
```

เทสต์ API แบบ end-to-end (node fetch — **อย่าใช้ curl บน Windows เพราะส่งภาษาไทยเพี้ยน**):
สร้างสคริปต์ที่ login → ค้นสินค้า → สร้างใบงาน → เปลี่ยนสถานะ 3 ระดับ → คอมเมนต์ → ลบ
เคสที่**ต้อง**เทสต์ทุกครั้งที่แตะ API:
1. เปลี่ยนสถานะแล้ว **รูปยังอยู่ครบ** (กับดัก §6.2)
2. `PUT` ไม่ทับ `comments` / `code` / `createdBy` (กับดัก §6.1)
3. `doneAt` ถูก set ตอนเข้า done และ **clear ตอนย้อนกลับ**
4. manager ลบใบงานได้ (สิทธิ์แบนราบ §4)

รันกับ production ได้โดยเปลี่ยน base URL — สคริปต์ลบใบทดสอบทิ้งเองตอนจบ

---

## 11. เผื่ออนาคต

- **PDF/เอกสารแนบ** — v1 รับเฉพาะรูป เพราะ Cloudinary free block PDF delivery โดย default
- **ZIP ก้อนเดียว** — ตอนนี้โหลดไล่ทีละไฟล์ (Chrome ถามอนุญาตครั้งแรกครั้งเดียว) ถ้าจะทำ zip ต้องเพิ่ม dependency
- **สถานะที่ 4 (ยกเลิก/พัก)** — ตั้งใจไม่ใส่ งานที่ไม่เอาแล้วให้ลบทิ้ง (ทุก role ลบได้)
- **แจ้งเตือน** — ยังไม่มี พี่ธีเห็นงานใหม่จาก badge ตัวเลขบนเมนู "งาน"
