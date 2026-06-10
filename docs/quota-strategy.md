---
title: Vercel + Upstash + Gemini Quota Strategy
last_reviewed: 2026-06-10
audience: both
---

# Quota Strategy

31panich runs on free tiers. Every code change should ask: **"does this add invocations / image opt / external API calls?"** If yes, justify it or cache it.

## The budget

| Service | Tier | Limit | What counts |
|---|---|---|---|
| Vercel | Hobby | ~100 GB bandwidth/month, ~100k function invocations/day (soft), 5,000 image optimizations/month, 6,000 build minutes/month | Page renders, API routes, ISR regenerations, image transforms |
| Upstash Redis | Free | **10,000 commands/day**, 256 MB storage | Every `GET`/`SET`/`INFO`/`DBSIZE` |
| Google Gemini | Free | Rate limits per minute; check current quota | Every `generateContent` call; Google Search grounding costs extra |
| Cloudinary | Free | 25 GB storage, 25 GB bandwidth/month | Image transforms + delivery |

## The patterns we use

### Redis key namespace
- `data:<filename>` — the JSON data store (products, coupons, etc.)
- `cache:gemini:<prefix>:<hash>` — Gemini response cache (`gemini-cache.ts`)
- (Phase 3) `quota:config`, `quota:snapshot:*`, `quota:alerts:unread` — quota dashboard

### Reuse the Redis singleton
**Always** import from `web/lib/blob-store.ts`:

```ts
import { redis } from "@/lib/blob-store"
// or use the higher-level helpers
import { readJSON, writeJSON, withLock } from "@/lib/blob-store"
```

**Never** `new Redis()`. Multiple clients waste connection slots and are harder to monitor.

### Cache Gemini calls
Use `cachedGenerateText` / `cachedGenerateTextWithSearch` from `web/lib/gemini-cache.ts` for any deterministic prompt (admin enrich, product check, search). **Do not** cache `/api/ai/chat` — chat history grows each turn so cache hits are near zero.

### ISR liberally
Default to `revalidate ≥ 3600` (1 hour). Use shorter values only when content genuinely changes faster (e.g., promotions can be 5 min). Every shorter ISR window multiplies your function invocation count.

### Generate static pages at build time
`generateStaticParams` for `/products/[category]` and `/products/[category]/[slug]` pre-renders ~150 pages at build time. They serve as static HTML until ISR re-renders them. This is the biggest single quota saver in the project.

### Atomic writes via `withLock`
Race-safe without a database. Per-instance lock (Map-based queue) — good enough for current traffic. If this becomes a bottleneck, swap to Redis SETNX.

## Anti-patterns (don't do these)

1. **Polling without Page Visibility API** — admin dashboards that `setInterval(fetch, 5000)` will burn through invocations even when the tab is in the background. Always check `document.visibilityState === "visible"` before polling
2. **`cache: "no-store"` on internal API calls** — that disables HTTP caching for the fetch and forces a fresh function invoke every time
3. **`revalidate: 0` on `next: {}`** — same effect; bypasses ISR and goes dynamic. We had this on `vercel-status` until 2026-04-09; now cached in-memory
4. **Unbounded Gemini retries** — if a Gemini call fails, do not retry in a loop. One retry max
5. **Image `<Image>` with dynamic remote URLs at low TTL** — every new transform variant counts toward the 5,000 image-opt quota. Set `images.minimumCacheTTL` long, prefer canonical sizes
6. **Background cron jobs without buy-in** — Vercel cron costs 1 invocation per run. Don't add a cron without thinking about the daily total
7. **Logging chat to Vercel Blob** — `chat-logger.ts` is intentionally a no-op. Re-enabling it costs Blob ops on every message. If we need logs, use Upstash with TTL eviction instead

## Top quota wins already applied (April 2026)

- **Homepage ISR**: 5 min → 1 hour. Saves ~264 invokes/day on the homepage alone
- **Gemini cache layer**: `web/lib/gemini-cache.ts` wraps `generateText` for deterministic prompts. `/api/ai/enrich` now hits cache on duplicate clicks
- **`vercel-status` cached**: 3 Vercel API calls per dashboard load → 1 set per 5 min
- **`upstash-status` cached**: 2 Redis commands per dashboard load → 1 set per 2 min
- **Legacy code removed**: `lib/medusa.ts` and `components/home/FeaturedProducts.tsx` were dead code, deleted
- **AI chat deterministic pipelines** (v2.0.10, +D in v2.1.17): Pipelines A/A2a/A2b/A3/C/D do NOT call Gemini — questions about hours / holidays / location / campaigns / short confirmations return fixed text in-process. Only Pipeline B (open-ended product/general) hits `generateContent`
- **TTS static WAV cache** (v2.0.10): deterministic replies (hours, no-holiday, location, +campaign in v2.1.21) are pre-generated once with Gemini TTS and served from Vercel CDN as static `.wav` files. ChatWidget checks `lookupCachedTts()` before calling `/api/ai/tts` — cached phrases hit zero Gemini TTS cost. Regen via `node scripts/gen-tts-cache.mjs [file.wav ...]` after changing a cached phrase (pass filenames to avoid re-spending quota on unchanged ones)

## ⚠ Quota exception: product detail page is force-dynamic

`web/app/(shop)/products/[category]/[slug]/page.tsx` deliberately uses `export const dynamic = "force-dynamic"` and does **not** use ISR or `generateStaticParams`. Every visit costs 1 lambda invocation.

**Why this exception exists**: Vercel Node 24 runtime fails on-demand ISR for newly-created Thai-slug routes. Forcing dynamic bypasses the bug. Quota cost is ~1500 invocations/day at current scale (~150 products × ~10 views/day) — still well under the Hobby soft limit.

**Full context**: see [`debugging.md`](./debugging.md) — section "Product detail page returns HTTP 500 right after I created or renamed a product".

**Do not revert** this to ISR without verifying the Vercel platform bug is fixed. If product detail traffic ever grows large (e.g., 50k+ pageviews/day), the right fix is to debug the underlying ISR issue, not to flip this back blindly.

## Pending (Phase 3 of active improvement plan)

- **`/admin/quota` dashboard** — real-time usage display (4 metric cards) + 7-day history + threshold-based alerts + budget mode (auto-disable AI when critical)
- **Hourly snapshot via Vercel Cron** (24 invokes/day, justified by visibility gain)
- **Browser Notification opt-in** for critical alerts

See `~/.claude/plans/nested-popping-snowglobe.md` for the full plan.

## How to evaluate a new feature for quota impact

Before committing, ask:

- **Does this add a new API route?** → How often will it be called? Can it be cached?
- **Does it add a new ISR page?** → What's the revalidate? Could it be SSG instead?
- **Does it call Gemini / Cloudinary / Upstash?** → How many calls per user action? Is there a cache layer?
- **Does it ship more JS / CSS to the client?** → Can it be lazy-loaded with `next/dynamic`?
- **Does it add an `<Image>`?** → Is the source URL stable? Are dimensions canonical?
- **Does it add background polling?** → Page Visibility API guard? Reasonable interval?

If you can't answer all of these, the feature isn't ready to ship.
