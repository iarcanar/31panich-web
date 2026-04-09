---
title: Recipe — Edit the AI System Prompt
last_reviewed: 2026-04-09
audience: both
---

# Edit the AI system prompt

Two layers: the **template** (in code) and the **runtime config** (in data, editable from the admin panel).

## Layer 1 — Runtime config (`ai-config.json`)

This is where you tweak the AI's behavior without touching code.

**Edit via admin panel (recommended):**

1. `/admin/login` → log in as admin (managers cannot edit AI config)
2. `/admin/settings` → AI Configuration section
3. Edit the **instructions** field — this becomes the bulk of the system prompt
4. Save → writes to `data:ai-config.json` in Redis → next chat request picks it up immediately (no cache invalidation needed; `getAiConfig()` is called per request)

**Edit directly (dev only):**

```bash
# In dev mode (no Redis env vars set)
$EDITOR web/data/ai-config.json
```

## Layer 2 — Template (in code)

The template lives in `web/app/api/ai/chat/route.ts`. It composes the runtime instructions with:

- Store config (`web/lib/store-config.ts`) — phone, hours, address
- Time-aware contact rules (uses `useBusinessHours` logic to know if shop is open)
- Product context from `buildChatContextWithProducts()` (`web/lib/ai-products.ts`)
- Knowledge snippets from `getRelevantKnowledge()` (`web/lib/ai-knowledge.ts`)

You only need to touch the template if you want to:
- Change how product context is formatted
- Add a new dynamic placeholder (e.g., insert today's date)
- Change the conversation rules / search behavior (`[SEARCH:keyword]` tag handling)

## Knowledge files

Trigger-based knowledge injection: `web/data/knowledge/points.txt` is read into the prompt only when the user mentions แต้ม / แลก / ของแลก. To add another knowledge area:

1. Create `web/data/knowledge/<topic>.txt`
2. Edit `web/lib/ai-knowledge.ts` to add a trigger pattern + file mapping
3. Test with a chat message containing the trigger

## Files involved

- `web/data/ai-config.json` — runtime config (Redis in production)
- `web/lib/ai-config.ts` — `getAiConfig`, `saveAiConfig`
- `web/app/api/ai/chat/route.ts` — system prompt template + chat handler
- `web/app/api/admin/ai-config/route.ts` — GET/PUT API (admin-only, blocked for managers in middleware)
- `web/lib/ai-knowledge.ts` — trigger-based knowledge injection
- `web/data/knowledge/*.txt` — knowledge snippets

## Things that go wrong

- **Manager tries to edit AI config** → 403 from middleware. By design — only `admin` role can edit
- **AI gives the same wrong answer repeatedly** → check if `gemini-cache.ts` is caching it. Chat itself is NOT cached, but if you're calling `cachedGenerateText` from somewhere, the result will stick for 5 min
- **Changes don't take effect** → make sure you saved via the admin panel (which writes to Redis), not just the local file
