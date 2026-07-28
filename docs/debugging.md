---
title: Debugging Playbook
last_reviewed: 2026-06-10
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

**Status**: structural quirk in `app/admin/products/page.tsx` — the product list has **two separate JSX trees** rendering the same fields (name, brand, sku, price, stock, image): compact card view (~line 1545) and table view (~line 1597). Edit one, miss the other → half the rows look broken in production.

**Before editing**: `grep -n "p.brand || p.sku" web/app/admin/products/page.tsx` should show **two matches** — patch both. Inline `⚠` comments mark each block pointing at the other.

**Past incident** (2026-04-09, fixed in 1.3.2): a SKU-display fix patched only the compact view; the table view kept the old `{p.brand && ...}` guard so SKUs stayed hidden.

**If you refactor this file** (Phase 4B): extract a shared `<ProductRow>` so this can't recur.

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
- Every product detail page visit now hits a lambda. Data comes from Upstash Redis with the 30s in-memory cache in `lib/blob-store.ts`, so it stays fast
- Quota cost: ~150 products × ~10 views/product/day = ~1500 invocations/day, well under Vercel Hobby's ~100k/day soft limit. Bandwidth and image-opt are unaffected (Cloudinary CDN serves images)

**🚫 Do not revert this** unless you have **verified end-to-end** that:
1. Vercel has fixed the runtime ISR bug (check Vercel changelog / status / forum)
2. You have reproduced a successful flow: deploy → admin creates a new Thai-named product → open the new URL → 200 (not 500)
3. The CRUD handlers in `app/api/products/route.ts` and `app/api/products/[id]/route.ts` still call `revalidatePath` correctly

If you DO revert, do it incrementally and test each product creation. Bring back `generateStaticParams` first (with a small subset), then add `revalidate`, watching production for 500s after each step.

**Other pages are unaffected** — `/products/[category]`, homepage, about, contact etc. still use ISR + `generateStaticParams` and work fine. Only the product **detail** page is forced dynamic.

**Long-term**: investigate root cause via Vercel runtime logs / log drain. Prime suspect is the URL decode / `getProductBySlug` interaction with Node 24 + Thai character handling, but local repro (Node 22) does not show the issue.

## "AI ตอบวันหยุดผิด / ไม่ตอบเรื่องวันหยุด"

**Status**: Fixed in v1.5.18 — multi-pipeline architecture (expanded in v2.0.10)

**How it works** (current): AI chat มีหลาย pipeline แยกกัน — route โดย keyword detection:
- **Pipeline A (Holiday-specific + data)**: คำเกี่ยวกับวันหยุด + มีข้อมูล → fixed reply สรุปวันหยุด (ไม่เรียก Gemini)
- **Pipeline A2a**: "มีวันหยุดมั้ย" แต่ไม่มีวันหยุด → fixed reply "ไม่มีวันหยุดพิเศษ"
- **Pipeline A2b**: "เปิดกี่โมง/เปิดมั้ย" → fixed reply ชั่วโมงเปิด
- **Pipeline A3 (v2.0.10)**: "อยู่ไหน/แถวไหน/แผนที่/นำทาง" → fixed reply พร้อม `mapLink:true` (ไม่เรียก Gemini)
- **Pipeline D (v2.1.17+)**: campaign active + keyword ("ไทยช่วยไทย/คนละครึ่ง/เป๋าตัง" — ดู `CAMPAIGN_KEYWORDS` ใน `lib/campaigns.ts`) → fixed `answer` สั้น หรือ `answerDetail` เมื่อถามรายละเอียด (ไม่เรียก Gemini)
- **Pipeline B (Product/Default)**: ไม่เข้าเงื่อนไขบน → prompt สินค้าเต็ม + Gemini
- **Pipeline C**: ยืนยันสั้นๆ ("ดู/เอา/โอเค") → extract keyword จาก turn ก่อน + `searchQuery` (ไม่เรียก Gemini)

**Where to look if holiday response is wrong:**
1. **ข้อมูลวันหยุด**: `web/data/holidays.json` (production: Redis `data:holidays.json`) — ตรวจ closedFrom, closedTo, reopenDate ถูกไหม
2. **Keyword list**: `web/app/api/ai/chat/route.ts` → `HOLIDAY_KEYWORDS` array — ตรวจว่ามีคำที่ลูกค้าใช้ไหม
3. **Holiday prompt**: `HOLIDAY_TEMPLATE` ใน route.ts — prompt ที่ Gemini ใช้ตอบเรื่องวันหยุด
4. **Admin UI**: `/admin/ai-logs` → accordion "วันหยุดนักขัตฤกษ์" — ตรวจว่า active หรือไม่

**Testing protocol**: เมื่อแก้ข้อมูลวันหยุดหรือ AI prompt ต้องทดสอบอย่างน้อย 5 คำถาม ผ่าน ChatWidget จริง — **ห้ามใช้ curl บน Windows** (ส่งภาษาไทยเพี้ยน → keyword detection ไม่ match → หลุดไป Pipeline B แบบงงๆ) ถ้าจะยิง API ตรง ใช้ Node แทน:

```bash
node -e "fetch('http://localhost:3001/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'ร้านเปิดกี่โมง'})}).then(r=>r.json()).then(j=>console.log(j.reply))"
```

1. ถามตรง ("สงกรานต์หยุดไหม")
2. ถามเวลา ("ร้านเปิดกี่โมง")
3. ถามวันที่ ("หยุดวันไหนถึงวันไหน")
4. ถามสินค้าระหว่างหยุด ("13 เมษา สั่งได้ไหม")
5. ถามสินค้าทั่วไป ("มีสว่านไหม" — ต้องไม่พูดเรื่องวันหยุด)

## "AI ตอบที่อยู่แบบเต็ม / ไม่ขึ้นปุ่ม Google Maps / ขึ้นปุ่มผิดที่"

**Status**: Expected behavior from v2.0.10 Pipeline A3

**How it works**: ข้อความที่มี keyword `อยู่ไหน / แถวไหน / แผนที่ / นำทาง / พิกัด / ไปร้าน / ไปยังไง / เดินทาง` จะถูก route เข้า Pipeline A3 เสมอ — ตอบด้วย `STORE_LANDMARK` fixed + `mapLink=true` (ไม่เรียก Gemini) ⇒ ได้ปุ่ม cyan "นำทางไปร้าน" ใต้ bubble

**ถ้าอยากเปลี่ยนข้อความ landmark**:
1. แก้ `STORE_LANDMARK` ใน `web/lib/store-config.ts`
2. รัน `cd web/ && node scripts/gen-tts-cache.mjs` เพื่อสร้าง `public/audio/tts/location.wav` ใหม่ (ไม่งั้นเสียงเดิมไม่ตรงกับข้อความใหม่)
3. commit ทั้งไฟล์ `.ts` + `.wav` ที่ถูก regen พร้อมกัน

**ถ้าอยากเพิ่ม keyword**: แก้ `LOCATION_KEYWORDS` ใน `web/app/api/ai/chat/route.ts`

**ถ้าถามรวมๆ เช่น "ร้านอยู่ไหน มีสินค้า X มั้ย"** → ยังคง hit A3 ก่อน (product part ตกหล่น) เป็น edge case ที่ยอมรับ ถ้าเจอบ่อย ให้พิจารณาเงื่อนไข A3 ให้เข้มกว่านี้

## "TTS เล่นเสียงไม่ตรงกับข้อความที่แสดง"

**Status**: มักเกิดจาก static cache mismatch (v2.0.10+)

**Root cause**: `web/lib/tts-cache.ts` maps ข้อความ reply → ไฟล์ WAV สำเร็จรูปใน `public/audio/tts/`. ถ้าข้อความใน `chat/route.ts` (Pipeline A2a/A2b/A3) หรือค่าคงที่ `HOURS_TEXT`/`STORE_LANDMARK` ถูกแก้ แต่ไฟล์ WAV ไม่ได้ regen → cache key match แต่เสียงคือของเก่า

**Fix:**
1. ยืนยันว่าข้อความ reply ในโค้ดตรงกับ key ใน `CACHED_TTS_REPLIES` (whitespace สำคัญ — `normalize()` ใน `lookupCachedTts` แค่ collapse ws เท่านั้น)
2. รัน `cd web/ && node scripts/gen-tts-cache.mjs <file.wav>` เพื่อ regen เฉพาะไฟล์ที่ข้อความเปลี่ยน (ไม่ใส่ args = regen ทั้งหมด — เปลือง TTS quota และเสียงไฟล์อื่นเปลี่ยน rendition โดยไม่จำเป็น)
3. commit ไฟล์ WAV ใหม่ + push — Vercel CDN serve ไฟล์ใหม่อัตโนมัติ

**กรณี campaign (Pipeline D)**: ข้อความ `answer` อยู่ใน Redis และแก้ได้จากหน้า admin — ถ้า admin แก้ข้อความแล้วไม่ regen WAV จะไม่พัง แค่ cache miss → fallback ไปเรียก `/api/ai/tts` สด (เสีย Gemini TTS ปกติ) ถ้าอยากให้ฟรีอีกครั้ง: แก้ key ใน `CACHED_TTS_REPLIES` ให้ตรงข้อความใหม่ + regen WAV + commit

**ถ้าอยากปิด cache ชั่วคราว**: ลบ entry ใน `CACHED_TTS_REPLIES` → `lookupCachedTts` จะ return undefined → ไป fetch `/api/ai/tts` สด (Gemini charge ปกติ)

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

## ⚠ "แก้ seed/default ในโค้ดแล้ว deploy แต่ production ไม่เปลี่ยน" (Redis seed drift)

**Status**: by design — เจอจริง 2026-06-10 กับ campaign "ไทยช่วยไทย"

**Root cause**: `readJSON()` ใน `blob-store.ts` seed จาก local file/default **เฉพาะตอน Redis key ว่าง** (first deploy) เท่านั้น — เมื่อ Redis มีข้อมูลแล้ว การแก้ `web/data/*.json` หรือ default ในโค้ด (เช่น `DEFAULT_CAMPAIGNS` ใน `lib/campaigns.ts`) + deploy จะ**ไม่มีผลใดๆ กับ production** ข้อมูลจริงกับโค้ดจึง drift จากกันเงียบๆ

**ไฟล์ที่เสี่ยง drift**: ทุกไฟล์ที่ admin แก้ได้ — `campaigns.json`, `holidays.json`, `ai-config.json`, `products.json`, `coupons.json`, `promotions.json`

**Fix — อัปเดต production ผ่าน admin เสมอ:**
1. ทางปกติ: หน้า admin UI (`/admin/ai-logs`, `/admin/products`, ...)
2. ทาง script (แก้ field ที่ UI ไม่มี): login `POST /api/admin/auth` → เก็บ cookie → `GET`/`PUT /api/admin/<resource>` — ตัวอย่างจริง: commit `40c0340` อัปเดต campaign answer + เติม `answerDetail` ที่หายไป
3. **ห้าม** เขียน Redis ตรงๆ ข้าม validation ของ API route

**วิธีตรวจว่า drift หรือไม่**: `GET /api/admin/<resource>` (production) เทียบกับ seed ในโค้ด — หรือยิงคำถามใส่ production chat API ตรงๆ แล้วเทียบคำตอบ

## "I added a product but it doesn't show on the homepage"

**Most likely:** ISR cache is stale. Homepage revalidates every 1 hour (`web/app/(shop)/page.tsx:1`).

**Fast fix:** call `revalidatePath("/")` from your CRUD handler (it should already do this — check `web/app/api/products/route.ts`)

**Slower:** wait up to 1 hour, or trigger a redeploy

**Actually broken if:** the `/admin/products` list also doesn't show it. Then it's a write failure — check Upstash Redis logs and look for `[blob-store] Redis write FAILED`

## "Product missing from search / chat AI doesn't see it"

**Likely:** in-memory cache in `blob-store.ts` is serving stale data. The Map cache has a 30s TTL but a warm lambda holds it through that window.

**Fixes:**

- Wait 30 seconds
- Or force a cold start by redeploying
- Or call the read with `noCache: true` (e.g., `readJSON("products.json", [], true)`)

**Actually broken if:** the product is also missing from `GET /api/products`. Then check `data:products.json` in Upstash directly

## "Cloudinary upload returns 422 / signature mismatch"

**Flow recap:** client requests signature from `/api/upload/sign` → uploads direct to Cloudinary with that signature

**Common causes:**

1. `CLOUDINARY_URL` env var missing or wrong format. Must be `cloudinary://<key>:<secret>@<cloudname>`
2. The params being signed don't match the params being uploaded. Check `web/app/api/upload/sign/route.ts` — only signed params should be sent to Cloudinary (do NOT add extras client-side after signing)
3. Clock skew on the server (signatures are time-bounded)
4. **อัปโหลดไฟล์แนบใบสั่งงานพังทั้งหมด** — โฟลเดอร์ `tasks` ใช้ `keepOriginal: true` ทำให้ sign route **ไม่ใส่ `format` ในพารามิเตอร์ที่เซ็น** ฝั่ง client จึงต้อง `fd.append("format", ...)` **เฉพาะเมื่อ `sign.format` มีค่า** ถ้า append ค่า `undefined` เข้าไป signature จะไม่ตรงทันที (ดู [`task-board.md`](./task-board.md) §5)

## ⚠ "รูปในใบสั่งงานหายหมดหลังกดเปลี่ยนสถานะ"

**อาการ:** กดปุ่ม "ทำเสร็จแล้ว" / "เริ่มทำงานนี้" แล้วรูปที่แนบไว้หายเกลี้ยงทั้งใบ และหายจาก Cloudinary ถาวรด้วย

**สาเหตุ:** `PUT /api/admin/tasks/[id]` มี logic ลบไฟล์ที่ถูกเอาออก โดยเทียบ attachment เก่ากับใหม่ ถ้าเผลอให้มัน diff ทุกครั้ง การส่ง body แค่ `{status}` จะถูกตีความว่า "รูปหายหมด" → `destroyCloudinaryAsset()` ลบไฟล์จริงทิ้ง

**กันไว้ 2 ชั้น — ห้ามรื้อ:**
1. ฝั่ง API: destroy เฉพาะเมื่อ body มี key `items` จริงๆ (`Object.prototype.hasOwnProperty.call(body, "items")`)
2. ฝั่ง UI: `TaskCard` ส่ง `{status}` เดี่ยวๆ เท่านั้น **ห้ามพ่วง `items` ไปกับ PUT เปลี่ยนสถานะ**

**เทสต์ที่ต้องรันทุกครั้งที่แตะ task API:** เปลี่ยนสถานะแล้วนับ attachment ต้องเท่าเดิม

## "เทสต์ API ใบสั่งงานบน dev แล้วผลตกแบบไม่มีเหตุผล"

**อาการ:** ลบใบงานแล้ว GET ยังเห็นอยู่ · โพสต์คอมเมนต์แล้วอีก request อ่านไม่เจอ — ทั้งที่โค้ดถูก

**สาเหตุ:** `blob-store` cache 30 วินาที (ตั้งใจ) + dev hot-reload โคลน module ทำให้แต่ละ route ถือ cache Map คนละก้อน route หนึ่งเขียนไฟล์แล้วอีก route อ่านค่าเก่าจาก cache ตัวเอง

**วิธีแยกแยะว่าเป็นบั๊กจริงหรือไม่:**
1. เปิด `web/data/tasks.json` บนดิสก์ดูข้อมูลจริง — ถ้าถูกต้อง = ไม่ใช่บั๊ก
2. รีสตาร์ท dev server แล้วรันเทสต์ใหม่
3. บน production ไม่เจอปัญหานี้ (instance เดียวต่อ invocation + Redis)

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

- **Do NOT raise `CACHE_TTL`** (in-memory Map, 30s — kept low so admin edits propagate fast). The Map is per-instance and does NOT gate Upstash; the real command gate is the `unstable_cache` layer (60s). Raise that layer's TTL if you genuinely need fewer commands
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

**ข้อยกเว้นที่ตั้งใจ — ระบบใบสั่งงาน `/admin/tasks` สิทธิ์แบนราบ**: manager ทำได้เท่า admin ทุกอย่างรวมถึงลบใบงาน ทุก route เช็กแค่ `getSessionUser()` ไม่มี `canPerform` เลย เป็นการตัดสินใจของเจ้าของร้าน **ห้ามเติม role check เข้าไปเพราะเห็นว่าไม่สม่ำเสมอกับหน้าอื่น** (ดู [`task-board.md`](./task-board.md) §4)

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
