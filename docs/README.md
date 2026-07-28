---
title: 31panich Documentation Index
last_reviewed: 2026-04-19
audience: both
---

# 31panich Documentation

Single source of truth for how this codebase fits together. **AI sessions: start with [`ai-quickstart.md`](./ai-quickstart.md)** — 30 seconds to get oriented.

## For AI sessions

1. [`ai-quickstart.md`](./ai-quickstart.md) — Project map + stack + 10 commands you'll actually run + "where-to-find-X" table
2. [`architecture.md`](./architecture.md) — Data flow diagrams (mermaid): how requests move through the app
3. [`folder-map.md`](./folder-map.md) — What every folder under `web/` is responsible for
4. [`debugging.md`](./debugging.md) — Symptoms → root cause → fix recipes
5. [`quota-strategy.md`](./quota-strategy.md) — How to stay inside Vercel/Upstash/Gemini free tiers

## Recipes (common tasks)

- [`recipes/add-product.md`](./recipes/add-product.md) — เพิ่มสินค้าใหม่
- [`recipes/edit-ai-prompt.md`](./recipes/edit-ai-prompt.md) — แก้ AI system prompt
- [`recipes/add-category.md`](./recipes/add-category.md) — เพิ่มหมวดสินค้าใหม่
- [`recipes/add-catalog.md`](./recipes/add-catalog.md) — เพิ่มแคตตาล็อกแบรนด์บนหน้าแรก
- [`recipes/clear-stale-coupon-claims.md`](./recipes/clear-stale-coupon-claims.md) — ล้าง claim count คูปอง

## Subsystems

- [`task-board.md`](./task-board.md) — ระบบใบสั่งงาน `/admin/tasks` (พนักงาน → ทีมทำสื่อ): โครงข้อมูล, สิทธิ์แบนราบ, รูปต้นฉบับ/Cloudinary, **กับดัก 4 ข้อที่ต้องอ่านก่อนแก้**

## Reference

- [`performance-checklist.md`](./performance-checklist.md) — ISR values, image sizes, prefetch strategy

## External pointers

- [`/CLAUDE.md`](../../CLAUDE.md) — Top-level dev guidelines (deploy, code rules, key configs)
- [`/31site_readme.md`](../../31site_readme.md) — Admin login, env vars, role permissions
- [`/admin_files/IMAGE_SPEC.md`](../../admin_files/IMAGE_SPEC.md) — Image conversion specs (WebP, sizes per type)
- [`/PRODUCT_SCRAPING_GUIDE.md`](../../PRODUCT_SCRAPING_GUIDE.md) — JSON schema for bulk product import

## Changelog

### 2026-07-28
- **ระบบใบสั่งงาน `/admin/tasks`** (adminVersion 1.10.0 → 1.11.0): พนักงานหน้าร้านสั่งงานทีมทำสื่อ — การ์ดละ 1 โปร ผูกสินค้าจาก DB แนบรูปต้นฉบับ ติดตามสถานะ รอทำ/กำลังทำ/เสร็จแล้ว + เครื่องมือดาวน์โหลดรูปทั้งหมด/ตั้งชื่อไฟล์อัตโนมัติ/คัดลอกบรีฟ → [`task-board.md`](./task-board.md)
- **`/api/upload/sign` รับ flag `keepOriginal`**: ข้ามการบังคับ `format=webp` เพื่อเก็บภาพต้นฉบับเต็มความละเอียด (backward compatible — reels/products ไม่ส่ง flag จึงได้ webp เหมือนเดิม) · ตอนแสดงผลต้องมี `f_auto` เสมอ ไม่งั้น HEIC จาก iPhone เปิดไม่ขึ้นบน Android
- **`components/admin/ui/TextInput.tsx` → `text-base md:text-sm`**: input ทั้ง admin เลิก auto-zoom บน iOS (แก้จุดเดียวมีผลทุกหน้า)

### 2026-06-10
- **Campaign chip answer + TTS cache** (v2.1.21): "ไทยช่วยไทย" chip now returns a short fixed answer with a pre-generated WAV (`campaign-thaichuaythai.wav`); details stay in `answerDetail`. `gen-tts-cache.mjs` accepts filename args for selective regen.
- **Docs: Pipeline D documented** across architecture/debugging/quota/edit-ai-prompt (was missing since v2.1.17); folder-map caught up on `lib/` (campaigns, coupon-status, date-utils, error-log, quota-check) and `data/` (campaigns, runtime-errors).
- **New debugging section: "Redis seed drift"** — editing in-code seeds/`data/*.json` does NOT update production once Redis holds the key; update via admin UI/API. This bit us with the campaign answer (production had a stale long answer + missing `answerDetail`).

### 2026-05-31
- **Discount badges → baht** (v2.1.16, 8 spots): pinned/hero, card, and variant badges now show "ลดทันที ฿X" / "ลด ฿X" instead of "%" (small-shop discounts read stronger in baht). Red/orange thresholds still use % internally — see [[project_admin_price_model]].
- **Docs accuracy**: corrected stale "5-min cache" → 30s across architecture/debugging/recipes (matches `CACHE_TTL` since 2026-05-29); removed the obsolete advice to raise `CACHE_TTL` to cut Upstash (it doesn't gate Upstash — the 60s `unstable_cache` does) — see [[blob-store-cache-30s-ttl-revalidatetag-needs-expire-0]].

### 2026-05-29
- **Homepage redesign** (v2.1.11–2.1.15): sci-fi hero → real-storefront `HomeHero` (greeter + welcome + phone/LINE); added bottom "ดูเล่นเพลินๆ" `DiscoverFeed`; A/B/C engagement tuning (card width, see-more, reviews, product cues); fixed PromoGrid 404 posters (moved to `public/promotions/`); fixed Thai mid-word line-break with `whitespace-nowrap` spans (DevTools ≠ real phone — see [[project_thai_linebreak_nowrap]]).
- **Admin product price** (adminVersion 1.6.9): unified single + variant to "ราคาเต็ม + ส่วนลด → ราคาขายจริง"; the form now shows the actual selling price clearly (was: single=final-price / variant=full-price, inverted).
- **Faster admin edits**: blob-store in-memory cache `CACHE_TTL` 5min→30s (quota-neutral; the 60s `unstable_cache` still gates Redis) so price edits reach ISR storefront cards within ~30s.

## Maintenance

Each doc has a `last_reviewed` date in its frontmatter. Refresh every quarter or when the architecture changes meaningfully.
