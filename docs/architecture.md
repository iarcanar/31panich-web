---
title: Architecture & Data Flow
last_reviewed: 2026-04-19
audience: both
---

# Architecture

31panich is a thin Next.js app over a JSON+Redis data store, with Gemini for AI features and Cloudinary for images. There is no SQL database. All "tables" are JSON files cached in Upstash Redis with in-process caching on top.

## High-level component map

```mermaid
flowchart LR
  Client[Client browser]
  Edge[Vercel Edge / Lambda]
  Redis[(Upstash Redis<br/>JSON data + cache)]
  Cloudinary[(Cloudinary<br/>images)]
  Blob[(Vercel Blob<br/>image fallback)]
  Gemini[(Google Gemini<br/>2.5 Flash)]

  Client -->|HTTPS| Edge
  Edge -->|readJSON / writeJSON| Redis
  Edge -->|cachedGenerateText| Gemini
  Edge -->|sign upload| Cloudinary
  Client -->|direct upload| Cloudinary
  Edge --> Blob
```

## Storage layer (`lib/blob-store.ts`)

Three modes, picked at runtime from env vars:

| Mode | When | Where data lives |
|---|---|---|
| `redis` | `UPSTASH_REDIS_REST_*` env set (production) | Upstash Redis, key `data:<filename>` |
| `blob` (legacy) | `BLOB_READ_WRITE_TOKEN` set, no Redis | Vercel Blob storage |
| `local-fs` | neither set (dev) | `web/data/*.json` on disk |

On top of all three:

- **In-memory cache** (`Map`, 30s TTL) deduplicates reads inside a warm lambda
- **Per-file write lock** (`withLock`) queues concurrent writes so read-modify-write is safe
- **Seeding**: first read from Redis falls back to local file and writes through (one-time migration)

## Request flow: load homepage `/`

```mermaid
sequenceDiagram
  participant U as User
  participant V as Vercel (ISR)
  participant L as lib/blob-store
  participant R as Upstash Redis

  U->>V: GET /
  V->>V: Cached HTML still fresh?
  alt Within revalidate window (1h)
    V-->>U: Return cached HTML
  else Stale
    V->>L: getActivePromotions() / getProducts()
    L->>L: Check in-memory cache
    alt Cache miss
      L->>R: GET data:promotions.json
      R-->>L: JSON
      L->>L: Cache for 30s
    end
    L-->>V: Data
    V->>V: Render React tree, cache HTML
    V-->>U: Return HTML
  end
```

Most pages are **prerendered statically** via `generateStaticParams` (15 categories + every product), revalidated every hour. Only API routes and the admin panel are fully dynamic.

## Request flow: AI chat

```mermaid
sequenceDiagram
  participant C as ChatWidget
  participant API as /api/ai/chat
  participant S as ai-session.ts
  participant P as ai-products.ts
  participant K as ai-knowledge.ts
  participant G as Gemini

  C->>API: POST { sessionId, message }
  API->>S: getSession(sessionId) or createSession()
  API->>API: Keyword detection — route to pipeline
  alt Pipeline C — instant confirmation ("ดู/เอา/โอเค")
    API->>API: Extract keyword from previous user turn
    API-->>C: Fixed reply + searchQuery (no Gemini call)
  else Pipeline A — holiday-specific with active/upcoming data
    API->>API: Compose fixed reply from holidays.json
    API-->>C: Fixed text (no Gemini call)
  else Pipeline A2a — "มีหยุดมั้ย" + none exist
    API-->>C: "ตอนนี้ไม่มีวันหยุดพิเศษครับ ร้านเปิด..." (cacheable WAV)
  else Pipeline A2b — plain "กี่โมง/เปิดมั้ย"
    API-->>C: "ร้านเปิดทุกวัน 7.30 – 17.30 น. ครับ" (cacheable WAV)
  else Pipeline A3 — location ("อยู่ไหน/แถวไหน/แผนที่/นำทาง")
    API-->>C: STORE_LANDMARK reply + mapLink:true (cacheable WAV)
  else Pipeline B — everything else (products/general)
    API->>P: buildChatContextWithProducts(message)
    P-->>API: Top 5 matches + category summary
    API->>K: getRelevantKnowledge(message)
    K-->>API: Knowledge snippets (e.g., points.txt)
    API->>G: generateContent(systemInstruction, history)
    G-->>API: Product response
    API->>API: Parse [SEARCH:] / [SUGGEST:] / [MAP] tags
  end
  API->>S: addToHistory(sessionId, response)
  API-->>C: { reply, searchQuery?, suggestion?, mapLink? }
```

**Multi-pipeline design**: AI chat uses keyword detection to route to separate pipelines. A/A2a/A2b/A3 return **deterministic** replies (no Gemini call) so they can be pre-rendered as static WAV audio. Only Pipeline B hits Gemini. This saves API cost on the most common questions (hours, location, confirmation) and avoids cross-contamination (e.g., product pipeline volunteering holiday info).

**TTS static cache** (v2.0.10): when a reply from a deterministic pipeline matches `CACHED_TTS_REPLIES` in `web/lib/tts-cache.ts`, the client plays the pre-generated WAV from `public/audio/tts/*.wav` (CDN-served) and skips `/api/ai/tts` entirely — zero Gemini TTS cost, instant playback. Regenerate cache with `node scripts/gen-tts-cache.mjs`.

**Tag rendering in ChatWidget**:
- `[SEARCH:keyword]` → auto-navigate to `/products?search=...` (panel stays open, user likely continues chat)
- `[SUGGEST:keyword]` → render purple "ดูสินค้า X" button; click closes panel + navigates
- `[MAP]` (or Pipeline A3 `mapLink:true`) → render cyan "นำทางไปร้าน" button; opens Google Maps in new tab

**Why chat is not cached** (at the Gemini-response layer): `gemini-cache.ts` exists but is opt-in. Pipeline B chat contents grow with every turn (history included), so cache hits would be near zero. Use it for `enrich` and other deterministic flows instead. TTS cache is different — it caches the *audio* for the deterministic pipeline outputs, where text is known to be byte-identical.

## Request flow: claim a coupon (atomic)

```mermaid
sequenceDiagram
  participant U as User
  participant API as /api/coupons/claim-count
  participant L as lib/coupons (atomicClaim)
  participant W as withLock("coupons.json")
  participant R as Upstash Redis

  U->>API: POST { id }
  API->>L: atomicClaim(id)
  L->>W: acquire lock
  W->>R: GET data:coupons.json (no cache)
  R-->>W: coupons[]
  W->>W: find coupon, check claimCount < usageLimit
  alt Sold out
    W-->>L: { soldOut: true }
  else OK
    W->>W: claimCount++
    W->>R: SET data:coupons.json
    W-->>L: { ok: true, count }
  end
  L->>W: release lock
  L-->>API: result
  API-->>U: response
```

The lock is **per-instance** (in-process `Map`), so two concurrent lambdas could still race. For 31panich's traffic this has been acceptable; if it ever becomes a problem, swap to Redis SETNX-based distributed locks.

## Request flow: admin enrich product (with Gemini cache)

```mermaid
sequenceDiagram
  participant A as Admin
  participant API as /api/ai/enrich
  participant Cache as gemini-cache (Redis)
  participant G as Gemini

  A->>API: POST { productId, action: "suggest" }
  API->>API: Build prompts from product + research
  API->>Cache: cachedGenerateTextWithSearch(researchPrompt)
  Cache->>Cache: Lookup hash key
  alt Hit
    Cache-->>API: Cached research (TTL 1h)
  else Miss
    Cache->>G: Live call (Google Search grounding)
    G-->>Cache: Research
    Cache->>Cache: Store with TTL
    Cache-->>API: Research
  end
  API->>Cache: cachedGenerateText(suggestPrompt)
  Cache-->>API: Description (TTL 5min)
  API-->>A: { result }
```

Same flow for `action: "check"`, with a different prompt template.

## Auth model

- Sessions are HMAC-SHA256-signed cookies (`admin_session`), 7-day expiry
- Users are stored in env var `ADMIN_USERS` as JSON: `[{id, password, role, name}]`
- Two roles: `admin` (full) and `manager` (everything except delete-coupon and ai-config)
- Enforcement: middleware blocks `/api/admin/ai-config` for managers; each destructive route also calls `canPerform(role, action)` defensively

See `web/lib/auth.ts` and `web/middleware.ts`.

## Image pipeline

1. Admin clicks upload in `/admin/products` or `/admin/coupons`
2. Frontend → POST `/api/upload/sign` → returns Cloudinary signature + params
3. Frontend → direct upload to `https://api.cloudinary.com/v1_1/<cloud>/image/upload`
4. Cloudinary returns final URL → saved into `products.json` / `coupons.json`

This bypasses our backend entirely for the actual file bytes — saving Vercel bandwidth + function time.

## Things that surprise people

- **No database**. JSON files in Redis.
- **No authentication on some POST routes** (`/api/products`, `/api/coupons` POST). This is a known smell — see [`debugging.md`](./debugging.md).
- **Chat sessions live in Lambda memory**, not Redis. They die on cold start. This is intentional (chat history is small + non-critical).
- **`web/data/*.json` is dev-only**. In production those files exist on disk too (for seeding) but the live data is in Redis.
- **The git repo is `web/`, not the project root**.
