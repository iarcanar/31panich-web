---
title: Recipe — Add a New Product
last_reviewed: 2026-04-09
audience: both
---

# Add a new product

Two paths: **admin panel** (recommended for one-offs) or **bulk import** (recommended for many).

## Path A — Admin panel (single product)

1. Go to `/admin/login` → log in
2. Open `/admin/products` → click **เพิ่มสินค้า**
3. Fill in:
   - **ชื่อสินค้า** (required) — Thai
   - **ราคา** + **ราคาเดิม** (optional, for showing discount)
   - **หมวด** — pick from the 15 in `web/lib/categories.ts`
   - **สต็อก**, **brand**, **SKU**, **catalog**
   - **คำอธิบาย** — type freely or click **AI ค้นหาข้อมูล** (uses `gemini-cache.ts`, free if you've enriched the same product within 5 min)
   - **รูปภาพ** — drag & drop. Frontend signs via `/api/upload/sign` and uploads direct to Cloudinary (no backend bandwidth used)
   - **flags**: `isNew`, `isBestseller`, `isPinned`
   - **variants** (optional): per-variant label / price / stock
4. Click **บันทึก**
5. The page calls `POST /api/products` → writes to `data:products.json` in Redis (with `withLock`) → triggers `revalidatePath` for `/`, `/products`, and `/products/[category]`
6. New product is live within seconds (admin) or 1 hour (homepage ISR)

## Path B — Bulk import (JSON)

For 10+ products at once.

1. Prepare a JSON file matching the schema in [`/PRODUCT_SCRAPING_GUIDE.md`](../../../PRODUCT_SCRAPING_GUIDE.md)
2. POST to `/api/products/import` with the array as the body
3. Each product gets an auto-generated `id`, `slug`, `createdAt`, `updatedAt`

## Image specs

See [`/admin_files/IMAGE_SPEC.md`](../../../admin_files/IMAGE_SPEC.md) for required dimensions per image type. TL;DR for products:

- WebP, quality 80
- Square aspect (1:1)
- 800x800px is the canonical size
- Use `admin_files/tools/remage.bat` (reMAGE GUI) to convert raw images

## Files involved

- `web/app/admin/products/page.tsx` — admin UI (large file — splitting in Phase 4)
- `web/app/api/products/route.ts` — POST handler
- `web/app/api/products/[id]/route.ts` — PUT/DELETE handler
- `web/app/api/products/import/route.ts` — bulk import
- `web/app/api/upload/sign/route.ts` — Cloudinary signature
- `web/lib/products.ts` — CRUD wrapper around `blob-store.ts`
- `web/data/products.json` — dev seed (production data lives in Redis)

## Things that go wrong

- **Image upload fails with "signature mismatch"** → `CLOUDINARY_URL` env var is missing or malformed (must be `cloudinary://key:secret@cloudname`)
- **Product appears in admin but not on homepage for 1 hour** → that's the ISR revalidate window. Force it by calling `revalidatePath` manually or wait
- **`category` is invalid** → must match a `value` in `web/lib/categories.ts`. Updating that file is its own recipe — see [`add-category.md`](./add-category.md)
