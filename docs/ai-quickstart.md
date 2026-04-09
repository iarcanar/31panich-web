---
title: AI Session Quick Start
last_reviewed: 2026-04-09
audience: ai-session
---

# AI Quick Start

You are working on **31panich.co.th** — a Thai hardware store (วัสดุก่อสร้าง / เครื่องมือช่าง). Read this once, then dive in.

## Stack at a glance

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 3
- **AI**: Google Gemini `gemini-2.5-flash` via `@google/genai`
- **Storage**: Upstash Redis (JSON data) + Cloudinary (images) + Vercel Blob (image fallback) + local filesystem (dev)
- **Deploy**: Git push to `iarcanar/31panich-web` main → Vercel auto-deploy
- **Monorepo layout**: project root is `C:\31-Site\` but **the git repo is in `web/`**. Always `cd web/` before git commands.

## 10 commands you will actually run

```bash
cd /c/31-Site/web        # always start here for git/build
npx next build            # must pass before any commit
git status                # see what changed
git log --oneline -10     # recent history
git add <specific files>  # never `git add .` (unrelated deletes are pending)
git commit -m "..."       # see CLAUDE.md for commit rules
git push                  # → triggers Vercel auto-deploy
python verify.py          # ONLY when touching env vars / auth
```

## Where to find X

| You want to… | Look at |
|---|---|
| Change the AI's personality / rules | `web/data/ai-config.json` (admin panel UI: `/admin/settings`) |
| Change the AI chat system prompt template | `web/app/api/ai/chat/route.ts` |
| Edit the 15 product categories | `web/lib/categories.ts` (single source of truth) |
| Change shop contact info (phone, LINE, hours) | `web/lib/store-config.ts` |
| Change a JSON data file (products, coupons, promotions) | `web/data/*.json` — but in production these live in Upstash Redis (see `lib/blob-store.ts`) |
| Add a new API route | `web/app/api/...` — wrap in try-catch, return `NextResponse.json({error}, {status: 500})` |
| Add a new page | `web/app/(shop)/...` for shop, `web/app/admin/...` for admin |
| Read/write JSON data with caching + atomic locks | `web/lib/blob-store.ts` (`readJSON`, `writeJSON`, `withLock`) |
| Call Gemini with caching | `web/lib/gemini-cache.ts` (`cachedGenerateText`, `cachedGenerateTextWithSearch`) |
| Check admin auth in an API route | `web/lib/auth.ts` (`getSessionUser`, then `user.role === "admin"`) |
| Upload an image | `/api/upload/sign` (returns Cloudinary signature) → client uploads direct to Cloudinary |

## Hard rules (do not break)

1. **Dark theme always** — `bg-[#0e0e14]`, cards `bg-[#1a1a28]`. Never use light backgrounds.
2. **Mobile-first** — every page must look right on mobile before desktop.
3. **Thai in UI, English in code** — UI strings in Thai, identifiers/comments mostly English.
4. **Bump version on every deploy** — `version` for shop changes, `adminVersion` for admin/lib changes (see [`CLAUDE.md`](../../CLAUDE.md)).
5. **Reuse Redis singleton** — never `new Redis()`. Import from `lib/blob-store.ts` (it exports `redis`).
6. **Quota consciousness** — every change should ask "does this add invocations / image opt / external API calls?" See [`quota-strategy.md`](./quota-strategy.md).
7. **Never `vercel deploy` or use Vercel CLI** — only `git push`.

## When something feels off

- Architecture confused you → [`architecture.md`](./architecture.md)
- Don't know where a file lives → [`folder-map.md`](./folder-map.md)
- Bug or weird behavior → [`debugging.md`](./debugging.md)
- Need to do a common task → [`recipes/`](./recipes/)
- About to ship something heavy → [`quota-strategy.md`](./quota-strategy.md) before committing
