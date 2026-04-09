---
title: Performance Checklist
last_reviewed: 2026-04-09
audience: both
---

# Performance Checklist

Quick reference for the perf-related settings that exist in the codebase. Cross-check this when adding new pages or images.

## ISR (Incremental Static Regeneration) — current values

| Page | `revalidate` | Strategy |
|---|---|---|
| `/` (home) | `3600` (1h) | Pre-rendered, regen 1/h |
| `/products/[category]` | `3600` | `generateStaticParams` pre-renders all 15 categories |
| `/products/[category]/[slug]` | `3600` | `generateStaticParams` pre-renders every product |
| `/promotions` | `300` (5min) | Shorter because promotions change more often |
| All other shop pages | static (no `revalidate`) | Plain SSG |
| `/admin/*` | dynamic | Auth-gated, no caching |
| API routes | varies — see source | Some have in-memory cache |

**Rule of thumb**: default to `≥3600`. Only go shorter if content genuinely needs it.

## Static generation

`generateStaticParams` runs at build time:
- `web/app/(shop)/products/[category]/page.tsx` → 15 pages
- `web/app/(shop)/products/[category]/[slug]/page.tsx` → ~140 pages

Together these account for the bulk of "static" routes shown in `next build` output. They drop function invocations dramatically vs. fully dynamic pages.

## Image strategy

- **Source**: Cloudinary (main CDN). Direct upload from client via signed params (`/api/upload/sign`)
- **Static assets**: WebP, quality 80, resized before being added to `web/public/`. Use `admin_files/tools/remage.bat` (reMAGE GUI) for batch conversion
- **Dimensions per type**: see [`/admin_files/IMAGE_SPEC.md`](../../../admin_files/IMAGE_SPEC.md)
- **`next/image`**: configured in `web/next.config.ts` with `images.remotePatterns` for Cloudinary, Vercel Blob, and a few legacy domains. Static asset cache headers set to 1 year immutable for `webp/png/svg/woff2`

## Font loading

Reduced to minimum needed (per `feedback_homepage_hero.md`-era cleanup). Avoid adding new web fonts without justification — every additional font weight = bytes on the wire.

## Lazy loading

- **`ChatWidget`** — always rendered, but visibility toggled by CSS (not React conditional render). This lets it be prefetched and instantly available
- **Below-the-fold images** — let `next/image` handle it (default behavior)
- **Heavy components** — use `next/dynamic` with `{ ssr: false }` if they don't need server rendering

## SEO

- **`web/app/sitemap.ts`** — dynamic sitemap, includes static pages + 15 categories + every product (~166 URLs total)
- **`web/public/robots.txt`** — `Allow: /`, points to sitemap. No dynamic generation
- **Structured data**: `web/lib/structured-data.ts` exports `localBusinessSchema` (LocalBusiness JSON-LD), injected on home page via `<script type="application/ld+json">`
- **OpenGraph / Twitter cards**: defined per page in `metadata` exports. Check existing pages before adding new ones

## Bundle size

Currently no `@next/bundle-analyzer` configured. If bundle bloat becomes a concern:
1. Install `@next/bundle-analyzer`
2. Run `ANALYZE=true npx next build`
3. Identify the heaviest deps and lazy-load them

## Things to verify before merging a perf-relevant change

- [ ] `npx next build` passes locally
- [ ] No new route is fully dynamic when ISR or SSG could work
- [ ] No new `<Image>` uses a non-canonical size
- [ ] No new polling loop without Page Visibility API guard
- [ ] No new `cache: "no-store"` or `revalidate: 0` on internal fetches
- [ ] Bumped `version` (frontend changes) or `adminVersion` (backend/lib) in `web/package.json`

## Known perf wins already applied

- Homepage ISR 5min → 1h (April 2026, [Phase 1 of active improvement plan](../../../Users/Welcome/.claude/projects/C--31-Site/memory/project_active_improvement_plan.md))
- Gemini response caching for deterministic prompts (`web/lib/gemini-cache.ts`)
- `vercel-status` and `upstash-status` API in-memory cache
- `generateStaticParams` for all product pages
- WebP everywhere, 1-year immutable cache headers for static assets
