---
title: Recipe — เปลี่ยน Popup Banner
last_reviewed: 2026-04-11
audience: both
---

# เปลี่ยน Popup Banner

Popup banner แสดงตอนเปิดหน้าแรก ใช้โปรโมทเทศกาล/โปรโมชั่น ระบบ config-driven — แก้แค่ 2 จุดในไฟล์เดียว

## ไฟล์ที่เกี่ยวข้อง

- `web/components/ui/PromoPopup.tsx` — config + component (แก้แค่ config ด้านบน)
- `web/components/ui/PromoPopupLazy.tsx` — lazy wrapper (ไม่ต้องแก้)
- `web/public/promotions/` — วางภาพที่นี่

## ขั้นตอน

### 1. เตรียมภาพ

- แปลงเป็น WebP (ใช้ reMAGE หรือเครื่องมืออื่น)
- จดขนาดจริง (width x height px) — ใช้ Pillow, reMAGE, หรือ Properties
- วางใน `web/public/promotions/`

### 2. แก้ config ใน `PromoPopup.tsx`

เปิดไฟล์ แก้แค่ 2 object ด้านบน:

```typescript
// จุดที่ 1 — ข้อมูลภาพ
const PROMO: PromoPopupConfig = {
  id: "newyear-2570",                           // unique id (ใช้กับ localStorage)
  image: "/promotions/newyear-2570.webp",        // path ภาพ
  imageWidth: 1200,                              // ← ขนาดจริงของภาพ
  imageHeight: 800,                              // ← ขนาดจริงของภาพ
  alt: "โปรโมชั่นปีใหม่ 2570",
}

// จุดที่ 2 — ข้อความ
const CONTENT: PromoContent = {
  title: "🎉 สวัสดีปีใหม่ 🎊",
  body: "บรรทัดแรก\nบรรทัดที่สอง",             // ใช้ \n ขึ้นบรรทัดใหม่
  infoPrimary: "🗓️ หยุด 31 ธ.ค. – 2 ม.ค.",    // กล่องซ้าย (สีแดง)
  infoSecondary: "✅ เปิด ศุกร์ 3 ม.ค.",        // กล่องขวา (สีเขียว)
  footer: "สวัสดีปีใหม่ค่ะ 🙏",
}
```

### 3. ทดสอบ

```bash
npx next dev
# เปิด http://localhost:3000
# ถ้าเคยกด "ไม่แสดงอีกวันนี้" → เปิด DevTools > Application > Local Storage > ลบ popup:*
```

### 4. ปิด popup (เอาออกชั่วคราว)

ลบ `<PromoPopupLazy />` ออกจาก `web/app/(shop)/layout.tsx` แล้ว commit

## หมายเหตุ

- **ภาพ ratio อะไรก็ได้** — ระบบใช้ `width`/`height` จริงคำนวณ ratio อัตโนมัติ ไม่ crop
- **id ต้อง unique ต่อแคมเปญ** — ถ้าใช้ id เดิม ลูกค้าที่กด "ไม่แสดงอีก" จะไม่เห็น popup ใหม่
- **ไม่มี date check** — แสดงถาวรจนกว่าจะเอาออกเอง (ป้องกัน hydration error จาก timezone)
