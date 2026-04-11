---
title: Architecture & Data Flow
last_reviewed: 2026-04-09
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

- **In-memory cache** (`Map`, 5-min TTL) deduplicates reads inside a warm lambda
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
      L->>L: Cache for 5 min
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
  API->>P: buildChatContextWithProducts(message)
  P->>P: Score products (Thai bidirectional matching)
  P-->>API: Top 5 matches + category summary
  API->>K: getRelevantKnowledge(message)
  K-->>API: Knowledge snippets (e.g., points.txt if message mentions แต้ม)
  API->>API: Keyword detection (หยุด/เปิด/ปิด/สงกรานต์/กี่โมง...)
  alt Holiday keyword detected + มีข้อมูลวันหยุด
    API->>API: Pipeline A — holiday-only prompt (short, no products)
    API->>G: generateContent(holidayPrompt, history)
    G-->>API: Holiday response (วันหยุด + คำอวยพร)
  else Holiday keyword + ไม่มีข้อมูล
    API-->>C: Fixed text "แจ้งผ่าน social media" (ไม่เรียก Gemini)
  else No holiday keyword
    API->>P: buildChatContextWithProducts(message)
    P-->>API: Top 5 matches
    API->>K: getRelevantKnowledge(message)
    K-->>API: Knowledge snippets
    API->>API: Pipeline B — product prompt (full)
    API->>G: generateContent(systemInstruction, history)
    G-->>API: Product response
  end
  API->>S: addToHistory(sessionId, response)
  API-->>C: { answer }
```

**Dual pipeline design** (v1.5.18+): AI chat uses keyword detection to route questions to separate pipelines. Holiday questions get a short focused prompt with only holiday data (no products to confuse Gemini). Product questions get the full product prompt with no holiday info mixed in. This prevents cross-contamination where Gemini answers holiday questions with product info or vice versa.

**Why chat is not cached**: `gemini-cache.ts` exists but is opt-in. Chat contents grow with every turn (history is included), so cache hits would be near zero. Use it for `enrich` and other deterministic flows instead.

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
