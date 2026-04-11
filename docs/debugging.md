---
title: Debugging Playbook
last_reviewed: 2026-04-09
audience: both
---

# Debugging

Symptom → root cause → fix. Add to this file whenever you hit a non-obvious issue and resolve it.

## "เปิดแชท AI แล้วเลื่อนจอ ทำให้หน้าเว็บเลื่อนตามทะลุ"

**Status**: fixed in v1.5.8 (commit `09bfae9`)

**Root cause**: `ChatWidget` panel เป็น `position: fixed` overlay แต่ไม่ได้ lock body scroll → touch-scroll บน panel area เลื่อนทั้ง chat messages และ page background พร้อมกัน (scroll-through/scroll-chaining)

**Fix**: `useEffect` ที่ set `document.body.style.overflow = "hidden"` เมื่อ `panelOpen = true` แล้ว restore เมื่อปิด ใน `web/components/chat/ChatWidget.tsx` (~line 54-58)

**ถ้าแก้ ChatWidget แล้วปัญหากลับ**: ตรวจว่า useEffect ที่ lock scroll ยังอยู่ — search `body.style.overflow` ใน ChatWidget ต้องเจอ 1 match

## ⚠ "I changed how products display in the admin list and only HALF of them updated"

**Status**: known structural quirk in `app/admin/products/page.tsx`. The product list has **two rendered views in the same file**:

1. **Compact card view** (~line 1545) — used for the small-card layout
2. **Table view** (~line 1597) — used for the table layout with clickable copy-SKU button

Both views render the same fields (name, brand, sku, price, stock, image) but have **separate JSX trees**. They look identical to a casual reader and both contain a render block guarded by something like `(p.brand || p.sku) && ...`.

**Search trick** before editing: `grep -n "p.brand || p.sku" web/app/admin/products/page.tsx` — you should see **two matches**. If you only update one, half the rows in production will look broken.

**Past incident** (2026-04-09): brand-empty rows lost their SKU display. Fix in 1.3.1 only patched the compact view at line 1545; the table view at 1594 still had the old `{p.brand && ...}` guard, so SKUs stayed hidden. Real fix was 1.3.2 which patched both. Inline `⚠` comments now mark both render blocks pointing at each other.

**Rule of thumb**: when editing the product list display, **always** open both blocks side-by-side and apply the same change. If you decompose this file in the future (Phase 4B refactor), extract a single shared `<ProductRow>` so this can never happen again.

## ⚠ "Product detail page returns HTTP 500 right after I created or renamed a product"

**Status**: known Vercel platform issue. **Already mitigated — do NOT undo the mitigation without reading this section.**

**Symptom:**
- Admin creates a new product, or renames an existing one (which changes its `slug`)
- Click "ดูรายละเอียด" → frontend `/products/<category>/<new-slug>` returns **HTTP 500**
- `/api/products` returns the product correctly
- `revalidatePath` is called by the PUT/POST handler, but doesn't help
- Waiting 30+ minutes doesn't help
- Pre-existing products (slugs that were in the build snapshot) still work fine
- `next dev` AND `next start` render the SAME url+data successfully on the local machine

**Root cause:** Vercel runtime started failing on-demand ISR for newly-created routes whose slug contains Thai characters, since the platform moved to **Node 24**. The build-time pre-render works (which is why old products are fine); only the runtime-time on-demand ISR for new slugs fails. Reproduces only on Vercel, never locally.

**Mitigation in place** (commit `3f360ac`):
- `web/app/(shop)/products/[category]/[slug]/page.tsx` has `export const dynamic = "force-dynamic"` and **no longer uses `generateStaticParams` or `revalidate`**
- Every product detail page visit now hits a lambda. Data comes from Upstash Redis with the 5-min in-memory cache in `lib/blob-store.ts`, so it stays fast
- Quota cost: ~150 products × ~10 views/product/day = ~1500 invocations/day, well under Vercel Hobby's ~100k/day soft limit. Bandwidth and image-opt are unaffected (Cloudinary CDN serves images)

**🚫 Do not revert this** unless you have **verified end-to-end** that:
1. Vercel has fixed the runtime ISR bug (check Vercel changelog / status / forum)
2. You have reproduced a successful flow: deploy → admin creates a new Thai-named product → open the new URL → 200 (not 500)
3. The CRUD handlers in `app/api/products/route.ts` and `app/api/products/[id]/route.ts` still call `revalidatePath` correctly

If you DO revert, do it incrementally and test each product creation. Bring back `generateStaticParams` first (with a small subset), then add `revalidate`, watching production for 500s after each step.

**Other pages are unaffected** — `/products/[category]`, homepage, about, contact etc. still use ISR + `generateStaticParams` and work fine. Only the product **detail** page is forced dynamic.

**Long-term**: investigate root cause via Vercel runtime logs / log drain. Prime suspect is the URL decode / `getProductBySlug` interaction with Node 24 + Thai character handling, but local repro (Node 22) does not show the issue.

## "AI ตอบวันหยุดผิด / ไม่ตอบเรื่องวันหยุด"

**Status**: Fixed in v1.5.18 — dual pipeline architecture

**How it works** (v1.5.18+): AI chat มี 2 pipeline แยกกัน:
- **Pipeline A (Holiday)**: keyword detect → พบคำเกี่ยวกับวันหยุด → ใช้ prompt สั้นเฉพาะวันหยุด (ไม่มีสินค้ามาปน)
- **Pipeline B (Product)**: ไม่พบ keyword → ใช้ prompt สินค้าปกติ (ไม่มีวันหยุดมาปน)

**Where to look if holiday response is wrong:**
1. **ข้อมูลวันหยุด**: `web/data/holidays.json` (production: Redis `data:holidays.json`) — ตรวจ closedFrom, closedTo, reopenDate ถูกไหม
2. **Keyword list**: `web/app/api/ai/chat/route.ts` → `HOLIDAY_KEYWORDS` array — ตรวจว่ามีคำที่ลูกค้าใช้ไหม
3. **Holiday prompt**: `HOLIDAY_TEMPLATE` ใน route.ts — prompt ที่ Gemini ใช้ตอบเรื่องวันหยุด
4. **Admin UI**: `/admin/ai-logs` → accordion "วันหยุดนักขัตฤกษ์" — ตรวจว่า active หรือไม่

**Testing protocol**: เมื่อแก้ข้อมูลวันหยุดหรือ AI prompt ต้องทดสอบอย่างน้อย 5 คำถาม ผ่าน ChatWidget จริง (ไม่ใช่ curl เพราะ encoding ต่างกัน):
1. ถามตรง ("สงกรานต์หยุดไหม")
2. ถามเวลา ("ร้านเปิดกี่โมง")
3. ถามวันที่ ("หยุดวันไหนถึงวันไหน")
4. ถามสินค้าระหว่างหยุด ("13 เมษา สั่งได้ไหม")
5. ถามสินค้าทั่วไป ("มีสว่านไหม" — ต้องไม่พูดเรื่องวันหยุด)

## "AI gives a wrong / off-brand answer"

**Where to look first:**

1. **Runtime config**: `web/data/ai-config.json` (production: Upstash Redis key `data:ai-config.json`). Edited via `/admin/ai-logs` → accordion "คำแนะนำ AI". The `instructions` field is the bulk of the system prompt
2. **Prompt template**: `web/app/api/ai/chat/route.ts` — Pipeline B (product) composes `instructions` with store config, contact rules, product context, knowledge snippets
3. **Product context**: `web/lib/ai-products.ts` → `buildChatContextWithProducts()` scores products against the user message. If the AI mentions wrong products, the scoring heuristic is the culprit
4. **Knowledge injection**: `web/lib/ai-knowledge.ts` decides when to inject knowledge files (e.g., `data/knowledge/points.txt` when message mentions แต้ม)

**Quick checks:**

- Was the answer cached? Chat itself is NOT cached (`gemini-cache.ts` is opt-in, used by `/api/ai/enrich` but not `/api/ai/chat`). If chat seems to give the same wrong answer, it's the prompt, not the cache
- Is the system prompt being saved? Check the admin UI's `/api/admin/ai-config` PUT response
- Is `temperature` too high? `web/lib/gemini.ts` uses 0.3 — fine for chat. Higher values would make answers drift

## "I added a product but it doesn't show on the homepage"

**Most likely:** ISR cache is stale. Homepage revalidates every 1 hour (`web/app/(shop)/page.tsx:1`).

**Fast fix:** call `revalidatePath("/")` from your CRUD handler (it should already do this — check `web/app/api/products/route.ts`)

**Slower:** wait up to 1 hour, or trigger a redeploy

**Actually broken if:** the `/admin/products` list also doesn't show it. Then it's a write failure — check Upstash Redis logs and look for `[blob-store] Redis write FAILED`

## "Product missing from search / chat AI doesn't see it"

**Likely:** in-memory cache in `blob-store.ts` is serving stale data. The Map cache has a 5-min TTL but a warm lambda holds it through that window.

**Fixes:**

- Wait 5 minutes
- Or force a cold start by redeploying
- Or call the read with `noCache: true` (e.g., `readJSON("products.json", [], true)`)

**Actually broken if:** the product is also missing from `GET /api/products`. Then check `data:products.json` in Upstash directly

## "Cloudinary upload returns 422 / signature mismatch"

**Flow recap:** client requests signature from `/api/upload/sign` → uploads direct to Cloudinary with that signature

**Common causes:**

1. `CLOUDINARY_URL` env var missing or wrong format. Must be `cloudinary://<key>:<secret>@<cloudname>`
2. The params being signed don't match the params being uploaded. Check `web/app/api/upload/sign/route.ts` — only signed params should be sent to Cloudinary (do NOT add extras client-side after signing)
3. Clock skew on the server (signatures are time-bounded)

## "Build fails locally"

**Run from `web/`** (always — the git repo is in `web/`, not the project root):

```bash
cd web
npx next build
```

**Common failures:**

- **TS strict errors** — `tsconfig.json` has `strict: true`. Read the error, fix the type. Don't `as any`
- **Module not found** — check `tsconfig.json` `paths` (uses `@/*` alias)
- **Image domain not configured** — add to `next.config.ts` `images.remotePatterns`
- **Env var not set** — production reads `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_*`, `CLOUDINARY_URL`, etc. Build can pass without them but routes will throw at runtime

## "Coupon claim count is wrong"

**See:** [`recipes/clear-stale-coupon-claims.md`](./recipes/clear-stale-coupon-claims.md)

**Atomic claim flow:** `POST /api/coupons/claim-count` → `atomicClaim()` → `withLock("coupons.json")` → check + increment + write

**Race condition window:** `withLock` is per-instance. Two warm lambdas can theoretically race. For 31panich's traffic this has been fine; if it ever matters, switch to Redis SETNX-based distributed locks

## "Vercel auto-deploy stopped working"

**Verify:**

```bash
# From web/
git log --oneline -3
# Then query latest deployment
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?limit=1" \
  | grep -o 'githubCommitSha":"[^"]*'
```

If `githubCommitSha` matches your latest local commit and `meta.githubDeployment: "1"`, auto-deploy is working.

If broken: see `~/.claude/projects/C--31-Site/memory/reference_vercel_deploy.md` for the manual API deploy fallback command. The integration was broken once (March 2026); fixed itself by April. If it breaks again, document it in that memory file.

## "Upstash Redis hit its daily command limit"

Upstash free tier = **10,000 commands/day**.

**Where commands come from (in rough order of volume):**

1. `readJSON()` calls in product/coupon handlers — every cold-start cache miss is one Redis GET
2. `writeJSON()` calls on every product/coupon CRUD
3. `gemini-cache.ts` reads/writes (recent addition — should be small)
4. `/api/admin/upstash-status` was hitting INFO + DBSIZE per request (now cached 2 min)

**Fixes:**

- Increase `CACHE_TTL` in `blob-store.ts` (currently 5 min). 10 min is safe for promotions/products
- Check `/admin/quota` (Phase 3 dashboard) for breakdown
- Disable any background polling in admin UI (use Page Visibility API)

## "Vercel function invocations spiking"

Look at `/api/admin/vercel-status` (now cached 5 min) → check `usage.function_invocations`.

**Most common cause for 31panich:**

1. Homepage ISR was at 5 min before April 2026 → 288 invokes/day from cache regen alone. Now 1 hour (24/day)
2. AI chat is unbounded by user traffic — every message = 1 Gemini call. Watch the chat-logs disabled state — re-enabling it doubles the writes per chat
3. Polling loops in admin pages without Page Visibility API guard

See [`quota-strategy.md`](./quota-strategy.md) for the full anti-pattern list.

## "Manager can't access something they should"

Check `web/lib/auth.ts` → `canPerform(role, action)`. Two-layer enforcement:

1. `web/middleware.ts` blocks `/api/admin/ai-config` for managers at the edge
2. Each destructive route also calls `canPerform()` defensively

Manager has access to: product CRUD (including delete), coupon view/edit/create. Manager does NOT have access to: delete coupons, edit AI config, view AI logs, settings page (nav hidden + middleware blocks).

## ปุ่มโทร/LINE ไม่ซ่อนตอนปิดร้าน

**Status**: Fixed in v1.6.0 — ContactLink component

**How it works** (v1.6.0+): ทุกจุดที่ใช้ `<ContactLink>` จะถูก guard อัตโนมัติผ่าน `useBusinessHours` hook:
- **เปิดทำการ (7.30–17.30)**: แสดงปุ่มปกติ คลิกโทร/เปิด LINE ได้
- **นอกเวลาทำการ / วันหยุด**: แสดง label "นอกเวลาทำการ" หรือ "หยุด[ชื่อเทศกาล]" แทนปุ่ม, opacity ลด, คลิกไม่ได้

**จุดที่ได้รับ guard (ผ่าน ContactLink):**
- Hero banner mobile + desktop (ผ่าน `HeroContactButton`)
- หน้า contact, warranty, about, promotions
- Product detail, category product grid
- PromoGrid, FeaturedProductBanner, ContactSection
- FloatingOrderButton (มี guard ของตัวเอง)
- ChatWidget (มี guard ของตัวเอง)

**จุดที่ไม่ต้อง guard (ยอมรับ):**
- Footer LINE QR — เป็นแค่ link add friend, LINE OA มี auto-reply บอกว่าปิดทำการอยู่แล้ว ลูกค้า add ได้ตลอด

**ถ้าเพิ่มปุ่มโทร/LINE ที่ใหม่**: ต้องใช้ `<ContactLink type="phone">` หรือ `<ContactLink type="line">` เสมอ ห้ามใช้ `<a href="tel:">` ตรง
