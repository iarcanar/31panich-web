---
title: Debugging Playbook
last_reviewed: 2026-04-09
audience: both
---

# Debugging

Symptom → root cause → fix. Add to this file whenever you hit a non-obvious issue and resolve it.

## "AI gives a wrong / off-brand answer"

**Where to look first:**

1. **Runtime config**: `web/data/ai-config.json` (production: Upstash Redis key `data:ai-config.json`). Edited via `/admin/settings`. The `instructions` field is the bulk of the system prompt
2. **Prompt template**: `web/app/api/ai/chat/route.ts` — see how `instructions` is composed with store config, time-aware contact rules, product context, knowledge snippets
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
