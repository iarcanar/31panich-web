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
- [`recipes/clear-stale-coupon-claims.md`](./recipes/clear-stale-coupon-claims.md) — ล้าง claim count คูปอง

## Reference

- [`performance-checklist.md`](./performance-checklist.md) — ISR values, image sizes, prefetch strategy

## External pointers

- [`/CLAUDE.md`](../../CLAUDE.md) — Top-level dev guidelines (deploy, code rules, key configs)
- [`/31site_readme.md`](../../31site_readme.md) — Admin login, env vars, role permissions
- [`/admin_files/IMAGE_SPEC.md`](../../admin_files/IMAGE_SPEC.md) — Image conversion specs (WebP, sizes per type)
- [`/PRODUCT_SCRAPING_GUIDE.md`](../../PRODUCT_SCRAPING_GUIDE.md) — JSON schema for bulk product import

## Maintenance

Each doc has a `last_reviewed` date in its frontmatter. Refresh every quarter or when the architecture changes meaningfully.
