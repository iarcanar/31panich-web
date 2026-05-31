---
title: Folder Map
last_reviewed: 2026-04-23
audience: both
---

# Folder Map

What every folder under `web/` is responsible for. When in doubt, search this file before grepping.

## Top-level structure

```
web/                    ← git repo lives here (not at C:\31-Site\)
├── app/                ← Next.js App Router pages + API routes
├── components/         ← React components organized by domain
├── lib/                ← Pure logic, data access, no JSX
├── data/               ← JSON data files (dev) + knowledge snippets
├── docs/               ← This documentation (you are here)
├── hooks/              ← Custom React hooks
├── types/              ← Shared TypeScript types
├── public/             ← Static assets served as-is
├── ai_context/         ← Screenshots used as visual reference for AI
└── package.json        ← version, adminVersion, deps
```

## `web/app/`

Next.js App Router. Two route groups, plus the API tree.

| Subfolder | Purpose | Key files |
|---|---|---|
| `(shop)/` | Public storefront — wraps customer-facing pages | `page.tsx` (home, ISR 1h), `layout.tsx` (shop chrome) |
| `(shop)/products/` | Product browsing | `[category]/page.tsx`, `[category]/[slug]/page.tsx` (both pre-generated via `generateStaticParams`) |
| `(shop)/promotions/` | Active promotions + verification page | `page.tsx` (ISR 5min), `verify/page.tsx` |
| `(shop)/about/`, `contact/`, `points/`, `warranty/`, `catalog/` | Static info pages | `page.tsx` each |
| `admin/` | Admin panel (auth-gated) | `layout.tsx` (auth wrapper + `useAuth`), `login/page.tsx` |
| `admin/products/` | Product CRUD + AI enrich | `page.tsx` (large — Phase 4 refactor planned; see memory `project_active_improvement_plan`) |
| `admin/coupons/` | Coupon CRUD | `page.tsx` |
| `admin/settings/` | Edit AI system prompt + view hosting/links | `page.tsx` |
| `admin/analytics/`, `ai-logs/`, `test-claim/` | Admin views — `ai-logs` = AI Back-end (chat logs + AI prompt + วันหยุด) | `page.tsx` each |
| `api/admin/` | Admin-only API routes | All require `getSessionUser()` admin check |
| `api/ai/chat/` | Customer chat with Gemini (dual pipeline: holiday / product) | `route.ts` — public, no auth |
| `api/holidays/active/` | Active holiday check for frontend (ISR 5min) | `route.ts` — public |
| `api/admin/holidays/` | Holiday CRUD (admin-only) | `route.ts` — GET/PUT |
| `api/ai/enrich/` | Admin product description AI | `route.ts` — uses `gemini-cache.ts` |
| `api/products/`, `coupons/`, `upload/` | CRUD + image upload signing | See [`architecture.md`](./architecture.md) for flow |
| `sitemap.ts`, `layout.tsx`, `not-found.tsx`, `globals.css` | Root-level page glue | — |

## `web/components/`

Organized by domain, not by component type.

| Subfolder | Purpose |
|---|---|
| `chat/` | `ChatWidget.tsx` (always rendered, CSS-toggle visibility for prefetch perf) + `ChatMessage.tsx` |
| `home/` | Sections used only on the homepage: `BestsellerSection`, `NewProductsSection`, `CategorySlideshowSection`, `RewardsCarousel`, `PromoGrid`, `GoogleReviewStrip`, `PromotionCouponsStrip`, `BannerShimmer` |
| `product/` | `ProductCard`, `ProductDetail`, `CategoryProductGrid`, `CategoryFilter` |
| `coupon/` | `CouponCard`, `CouponClaimModal`, `CouponGrid` |
| `points/` | `HowToCollect` (loyalty program explainer) |
| `admin/` | `AdminModeProvider`, `AiEnrichButton`, `ImageCropPicker` |
| `layout/` | `Header`, `Footer`, `FloatingOrderButton` (cross-page chrome) |
| `ui/` | Generic primitives: `ScrollToTop`, `ContactLink` (**ปุ่มโทร/LINE พร้อม guard เวลาทำการ+วันหยุด** — ทุกปุ่มต้องใช้ component นี้ รองรับ `openClassName` สำหรับ effect ที่ active เฉพาะตอนเปิด), `SectionHeading`, `PromoPopup` + `PromoPopupLazy` (popup banner config-driven), `DriftSphereOverlay` (canvas dot-cluster bg overlay, 3 sizes + ambient variant, drift-area bounds, blend-mode, reveal delay) |
| `util/` | `ImageContextGuard` — site-wide `contextmenu` suppression on `<img>` targets only (casual "save image" deterrent, F12/text right-click unaffected). Mounted once in root `layout.tsx` |
| `home/SectionHeader` | Reveal-on-intersect animated heading for homepage sections (letter stagger + underline + spotlight + idle pulse + optional hero float) — replaces legacy `ScrollGlowFrame` |
| `home/ProductCarousel`, `RewardsCarousel`, `CategorySlideshow` | All use `useDragScroll` for PC click-hold drag (iOS-style momentum, threshold-rebased, click preserved for `<a>` children). `CategorySlideshow` desktop: rAF scrollLeft auto-scroll (no CSS transform anim) so drag + auto-loop share the same primitive |

## `web/lib/`

All business logic. No JSX in here.

| File | Exports | What it does |
|---|---|---|
| `blob-store.ts` | `readJSON`, `writeJSON`, `withLock`, `writeFile`, `redis` | **The storage abstraction**. Reuse the exported `redis` singleton — never `new Redis()`. |
| `products.ts` | `getProducts`, `getProductsByCategory`, `getProductById`, CRUD ops | Wraps `blob-store.ts` for `products.json`, with `React.cache()` for request-level dedup |
| `coupons.ts` | `getCoupons`, `atomicClaim`, `resetClaimCount`, CRUD ops | Coupon CRUD + the atomic claim lock |
| `coupon-claims.ts` | `addClaim`, `removeAllClaimsForCoupon`, `ClaimRecord` type | Claim record store + serial generation |
| `categories.ts` | `CATEGORIES` (15 items), `getCategoryLabel` | **Single source of truth** for product categories. Adding one is a recipe — see [`recipes/add-category.md`](./recipes/add-category.md) |
| `store-config.ts` | `STORE_NAME`, `PHONE`, `LINE_ID`, `LINE_POINTS_URL`, `HOURS_TEXT`, `ADDRESS`, `GEO`, `STORE_LANDMARK`, business hours helpers | **Single source of truth** for shop contact info. `STORE_LANDMARK` drives Pipeline A3 chat replies + cached TTS WAV — regen cache after editing (`node scripts/gen-tts-cache.mjs`) |
| `promotions.ts` | `getActivePromotions` | Filter `promotions.json` by date + return top N |
| `auth.ts` | `verifyCredentials`, `createSession`, `getSessionUser`, `canPerform`, `UserRole` | Admin auth (HMAC-SHA256 signed cookies, env-based user list) |
| `gemini.ts` | `getGeminiClient`, `generateText`, `generateTextWithSearch` | Raw Gemini wrapper, no cache |
| `gemini-cache.ts` | `cachedGenerateText`, `cachedGenerateTextWithSearch` | **Use this instead of `gemini.ts` for repeatable prompts.** Hash-keyed Redis cache |
| `ai-session.ts` | session in-memory store | Chat session history, 10 turn cap, 10 min TTL |
| `ai-config.ts` | `getAiConfig`, `saveAiConfig`, `AiConfig` type | Read/write `data/ai-config.json` |
| `ai-products.ts` | `buildChatContextWithProducts`, `buildEnrichContext` | Score products against a Thai query (bidirectional matching), build context strings |
| `ai-knowledge.ts` | `getRelevantKnowledge` | Trigger-based knowledge injection (e.g., "แต้ม" → reads `data/knowledge/points.txt`) |
| `holidays.ts` | `getHolidays`, `saveHolidays`, `getActiveHoliday`, `getUpcomingHoliday`, `isHolidayClosed` | วันหยุดนักขัตฤกษ์ — ข้อมูลจาก `holidays.json`, ใช้ทั้ง AI pipeline + frontend buttons |
| `chat-logger.ts` | `logChat` (no-op), `getChatLogs` | **Disabled** to save Vercel Blob ops |
| `tts.ts` | `generateSpeech`, `cleanForTTS`, `pcmToWav`, `normalizeThaiTimes`, `normalizeBrandPronunciation`, `TTS_CONFIG` | Gemini TTS wrapper — hybrid 3.1→2.5 fallback, voice Orus, Thai time normalization, brand phonetic overrides |
| `tts-cache.ts` | `CACHED_TTS_REPLIES`, `lookupCachedTts` | Phrase → static WAV URL map. ChatWidget checks this before calling `/api/ai/tts` so deterministic FAQ replies are served from CDN. Regen WAVs with `node scripts/gen-tts-cache.mjs` |
| `catalogs.ts` | `CATALOGS` | Catalog PDF list |
| `structured-data.ts` | `localBusinessSchema` | JSON-LD for SEO (LocalBusiness schema injected on home) |
| `reels.ts` | `getReels`, `getActiveReels`, `getReelById`, `createReel`, `updateReel`, `deleteReel`, `reorderReels` | Facebook Reels CRUD — wraps `reels.json` with `withLock`. DB record only — Cloudinary files handled separately by `cloudinary-delete.ts` |
| `cloudinary-delete.ts` | `destroyCloudinaryAsset(url, resourceType)`, `publicIdFromUrl(url)` | **Hard-deletes Cloudinary assets.** Parses `CLOUDINARY_URL` env → extracts publicId from URL → calls `uploader.destroy({ invalidate: true })`. Used by reel DELETE/PUT routes to prevent orphan storage. Silent on failure (logs only) |

## `web/data/`

JSON data files. In dev these are read/written directly. In production they live in Upstash Redis under key `data:<filename>`; the local files are just seed data.

| File | Shape | Notes |
|---|---|---|
| `products.json` | `Product[]` | ~285 KB. See `lib/products.ts` for the type |
| `coupons.json` | `Coupon[]` | Includes `claimCount` updated atomically |
| `coupon-claims.json` | `ClaimRecord[]` | One row per claim |
| `ai-config.json` | `AiConfig` | System instruction + product rules. Edited via admin panel |
| `promotions.json` | `Promotion[]` | Marketing promos shown on home |
| `reviews.json` | Google reviews snapshot | Used by `GoogleReviewStrip` |
| `holidays.json` | `Holiday[]` | วันหยุดนักขัตฤกษ์ (id, name, closedFrom/To, reopenDate, greeting, active) |
| `chat-logs.json` | `ChatLog[]` | Logger disabled, file kept for shape |
| `knowledge/points.txt` | plain text | Loyalty program info injected into chat when triggered |

## `web/public/`

| Subfolder | Contents |
|---|---|
| `products/` | Product photos (WebP) |
| `brands/` | Brand logos |
| `promotions/` | Promotion campaign images + popup banner images (ใช้โดย `PromoPopup`) |
| `points/` | Loyalty reward images |
| `category-icons/` | One SVG per category (15 files: `tools.svg`, `paint.svg`, etc.) |
| `catalog/` | PDF product catalogs |
| `audio/tts/` | Pre-generated TTS WAV files for FAQ replies (`hours-open.wav`, `no-holiday.wav`, `location.wav`). Regen via `node scripts/gen-tts-cache.mjs` after changing any cached phrase |

Plus the homepage banner (`banner-mobile.webp`), favicons, and `robots.txt`.

## `web/scripts/`

| File | Purpose |
|---|---|
| `sync-from-redis.mjs` | Pulls production Redis → `data/*.json` for local dev (called by `npm run sync`) |
| `gen-tts-cache.mjs` | One-shot generator for FAQ TTS WAV cache. Mirrors `cleanForTTS` + `pcmToWav` from `lib/tts.ts` so output matches the live route. Run manually when a cached phrase text changes |

## Other top-levels

- `web/hooks/useBusinessHours.ts` — opens/closed status + holiday awareness (used by `ChatWidget`, `FloatingOrderButton`, `ContactLink`). Fetches `/api/holidays/active` on mount, returns `{ isOpen, isMobile, holiday, isHoliday }`
- `web/hooks/useDragScroll.ts` — iOS-style click-hold drag-scroll for PC (mouse pointers only; touch/pen fall through to native). Takes a `React.RefObject`, returns `{ isDragging, isAnimating, isPressed }`. Handles rebased threshold (no jump on engage), deferred `setPointerCapture` (preserves click on `<a>` children), velocity-sampled momentum with max cap, suppresses native `dragstart` + `contextmenu`. `isPressed` pauses auto-scroll loops (used in `CategorySlideshow` desktop)
- `web/hooks/useAnimationActivity.ts` — generic rAF-gate hook. Takes a ref, returns a boolean ref that's `false` when tab hidden OR target scrolled offscreen (100px rootMargin). Consume inside rAF loops to skip work without stopping the frame callback. Used by `DriftSphereOverlay`
- `web/types/promotion.ts` — shared promotion type
- `web/middleware.ts` — auth gate for admin routes + AI-config protection from managers
- `web/next.config.ts` — image domains, version exposure, asset cache headers
- `web/tsconfig.json` — strict mode, `@/*` path alias

## Project root (above `web/`)

These live in `C:\31-Site\` outside the git repo:

- `CLAUDE.md` — top-level dev guidelines
- `31site_readme.md` — admin login + env vars + role permissions
- `PRODUCT_SCRAPING_GUIDE.md` — bulk product import schema
- `verify.py` — required before deploy/auth changes
- `admin_files/` — image source files, marketing assets, conversion tools (reMAGE)
