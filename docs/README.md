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

## Reference

- [`performance-checklist.md`](./performance-checklist.md) — ISR values, image sizes, prefetch strategy

## External pointers

- [`/CLAUDE.md`](../../CLAUDE.md) — Top-level dev guidelines (deploy, code rules, key configs)
- [`/31site_readme.md`](../../31site_readme.md) — Admin login, env vars, role permissions
- [`/admin_files/IMAGE_SPEC.md`](../../admin_files/IMAGE_SPEC.md) — Image conversion specs (WebP, sizes per type)
- [`/PRODUCT_SCRAPING_GUIDE.md`](../../PRODUCT_SCRAPING_GUIDE.md) — JSON schema for bulk product import

## Changelog

### 2026-05-31
- **Discount badges → baht** (v2.1.16, 8 spots): pinned/hero, card, and variant badges now show "ลดทันที ฿X" / "ลด ฿X" instead of "%" (small-shop discounts read stronger in baht). Red/orange thresholds still use % internally — see [[project_admin_price_model]].
- **Docs accuracy**: corrected stale "5-min cache" → 30s across architecture/debugging/recipes (matches `CACHE_TTL` since 2026-05-29); removed the obsolete advice to raise `CACHE_TTL` to cut Upstash (it doesn't gate Upstash — the 60s `unstable_cache` does) — see [[blob-store-cache-30s-ttl-revalidatetag-needs-expire-0]].

### 2026-05-29
- **Homepage redesign** (v2.1.11–2.1.15): sci-fi hero → real-storefront `HomeHero` (greeter + welcome + phone/LINE); added bottom "ดูเล่นเพลินๆ" `DiscoverFeed`; A/B/C engagement tuning (card width, see-more, reviews, product cues); fixed PromoGrid 404 posters (moved to `public/promotions/`); fixed Thai mid-word line-break with `whitespace-nowrap` spans (DevTools ≠ real phone — see [[project_thai_linebreak_nowrap]]).
- **Admin product price** (adminVersion 1.6.9): unified single + variant to "ราคาเต็ม + ส่วนลด → ราคาขายจริง"; the form now shows the actual selling price clearly (was: single=final-price / variant=full-price, inverted).
- **Faster admin edits**: blob-store in-memory cache `CACHE_TTL` 5min→30s (quota-neutral; the 60s `unstable_cache` still gates Redis) so price edits reach ISR storefront cards within ~30s.

## Maintenance

Each doc has a `last_reviewed` date in its frontmatter. Refresh every quarter or when the architecture changes meaningfully.
