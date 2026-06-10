---
title: Recipe — Edit the AI System Prompt
last_reviewed: 2026-06-10
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

The chat route (`web/app/api/ai/chat/route.ts`) uses a **multi-pipeline** architecture. Only Pipeline B calls Gemini; the rest are deterministic (fixed text + optional flag) so they're fast, cheap, and cache-friendly for TTS.

### Pipeline A — Holiday-specific + active/upcoming data
- **When**: `isHolidaySpecific(message)` matches `HOLIDAY_SPECIFIC_KEYWORDS` ("หยุด", "วันหยุด", "เทศกาล", ...) **and** there's an active/upcoming holiday in `holidays.json`
- **Reply**: fixed composition from holiday data + Thai greeting (no Gemini call)

### Pipeline A2a — Holiday-specific, no holiday active
- **When**: same keyword set, but no active/upcoming holiday
- **Reply**: `"ตอนนี้ไม่มีวันหยุดพิเศษครับ ร้านเปิดบริการทุกวัน ${HOURS_TEXT} ครับ"` (cached WAV)

### Pipeline A2b — Plain hours question
- **When**: `HOURS_GENERAL_KEYWORDS` ("กี่โมง", "เปิดไหม", ...) matches and not holiday-specific
- **Reply**: `"ร้านเปิดทุกวัน ${HOURS_TEXT} ครับ"` (cached WAV)

### Pipeline A3 — Location question (v2.0.10)
- **When**: `LOCATION_KEYWORDS` ("อยู่ไหน", "แถวไหน", "แผนที่", "นำทาง", "พิกัด", "ไปร้าน", "ไปยังไง", "เดินทาง") matches
- **Reply**: `"ร้านอยู่${STORE_LANDMARK}ครับ กดเพื่อนำทางได้เลยครับ"` + `mapLink: true` → client renders cyan "นำทางไปร้าน" button (cached WAV)
- **To change the description**: edit `STORE_LANDMARK` in `web/lib/store-config.ts` **AND** rerun `node scripts/gen-tts-cache.mjs` to regenerate `public/audio/tts/location.wav`
- **To change which keywords trigger**: edit `LOCATION_KEYWORDS` array in `route.ts`

### Pipeline D — Special promo campaign (v2.1.17)
- **When**: there is an active campaign (`getActiveCampaign()` — date range + `active` flag in `campaigns.json`) **and** `CAMPAIGN_KEYWORDS` matches ("ไทยช่วยไทย", "คนละครึ่ง", "เป๋าตัง", "ร่วมโครงการ", ...)
- **Reply**: fixed `answer` (short, cached WAV) — or `answerDetail` when `CAMPAIGN_DETAIL_KEYWORDS` also match ("กี่บาท", "เงื่อนไข", "ใช้ยังไง", ...)
- **Chip**: an active campaign also adds a starter chip (`chipLabel`) in ChatWidget via `/api/campaigns/active`
- **To change answers/keywords**: answers via `/admin/ai-logs` → "โปรพิเศษ / โครงการรัฐ" (data lives in Redis — ⚠ editing `DEFAULT_CAMPAIGNS` in code does NOT update production, see debugging.md "Redis seed drift"); keywords in `web/lib/campaigns.ts`
- **TTS**: the campaign `answer` has a cached WAV — if you change the answer text, update the matching key in `web/lib/tts-cache.ts` and regen (`node scripts/gen-tts-cache.mjs campaign-thaichuaythai.wav`), or accept fallback to live TTS

### Pipeline C — Instant confirmation
- **When**: short message like "ดู / เอา / โอเค / ได้เลย" and session has a previous product question
- **Reply**: extract keyword from previous turn → fixed "ดูสินค้าที่หน้าเว็บได้เลยครับ" + `searchQuery` for auto-navigation

### Pipeline B — Everything else (default)
- **When**: no deterministic pipeline matches
- **Prompt**: `SYSTEM_TEMPLATE` — full product context + knowledge + contact rules + location/parking script
- **Data**: `ai-config.json` + `ai-products.ts` + `ai-knowledge.ts`
- **Tag handling on Gemini output**:
  - `[SEARCH:keyword]` → `searchQuery` in response (client auto-navigates to `/products?search=`)
  - `[SUGGEST:keyword]` → `suggestion.keyword` in response (client renders purple button)
  - `[MAP]` → `mapLink: true` in response (client renders cyan map button)

### When to touch each layer

- **Edit `ai-config.json` via admin panel** → change AI tone/personality in Pipeline B only
- **Edit `SYSTEM_TEMPLATE` in `route.ts`** → change how product context is built, add new placeholders, edit the parking/location prompt guidance, change tag behavior
- **Edit `STORE_LANDMARK`** → change Pipeline A3 output (and regen TTS cache)
- **Edit `LOCATION_KEYWORDS` / `HOURS_GENERAL_KEYWORDS` / `HOLIDAY_SPECIFIC_KEYWORDS`** → change which questions route to which pipeline
- **Add a new Pipeline A-series (deterministic)** → safer + cheaper than letting Gemini handle a common FAQ. If the new reply is static enough to cache, also add it to `web/lib/tts-cache.ts` and regen the WAV

### TTS cache contract

Any deterministic-pipeline reply text that's listed in `CACHED_TTS_REPLIES` in `web/lib/tts-cache.ts` will play a pre-generated WAV from `public/audio/tts/`. When you change that reply text, you **must** rerun `node scripts/gen-tts-cache.mjs <file.wav>` (pass the changed file only) and commit the new `.wav` — otherwise the audio plays the OLD text while the UI shows the NEW text. Exception: campaign answers edited via admin just cache-miss → live TTS fallback (works, but costs quota).

## Layer 3 — Holiday data (admin panel)

Holiday info is auto-injected into AI Pipeline A when active. Managed via admin panel:

1. `/admin/ai-logs` → accordion "วันหยุดนักขัตฤกษ์"
2. เพิ่ม/แก้ไข/ลบวันหยุด → กด "บันทึก"
3. ข้อมูลจะถูกใช้ทั้ง AI chat (Pipeline A) และ frontend buttons (ซ่อนปุ่มโทร/LINE)

Data: `web/data/holidays.json` (Redis: `data:holidays.json`)

## Knowledge files

Trigger-based knowledge injection: `web/data/knowledge/points.txt` is read into the prompt only when the user mentions แต้ม / แลก / ของแลก. To add another knowledge area:

1. Create `web/data/knowledge/<topic>.txt`
2. Edit `web/lib/ai-knowledge.ts` to add a trigger pattern + file mapping
3. Test with a chat message containing the trigger

## Files involved

- `web/data/ai-config.json` — runtime config (Redis in production)
- `web/lib/ai-config.ts` — `getAiConfig`, `saveAiConfig`
- `web/app/api/ai/chat/route.ts` — multi-pipeline handler (HOLIDAY_TEMPLATE + SYSTEM_TEMPLATE + deterministic replies)
- `web/lib/campaigns.ts` + `web/data/campaigns.json` — Pipeline D data + keywords
- `web/app/api/admin/campaigns/route.ts` — campaign CRUD (admin)
- `web/app/api/admin/ai-config/route.ts` — GET/PUT API (admin-only, blocked for managers in middleware)
- `web/lib/ai-knowledge.ts` — trigger-based knowledge injection
- `web/data/knowledge/*.txt` — knowledge snippets
- `web/data/holidays.json` — วันหยุดนักขัตฤกษ์ (auto-injected into Pipeline A)
- `web/lib/holidays.ts` — holiday data access + active/upcoming check
- `web/app/api/admin/holidays/route.ts` — Holiday CRUD API
- `web/app/api/holidays/active/route.ts` — public active holiday check (ISR 5min)

## Things that go wrong

- **Manager tries to edit AI config** → 403 from middleware. By design — only `admin` role can edit
- **AI gives the same wrong answer repeatedly** → check if `gemini-cache.ts` is caching it. Chat itself is NOT cached, but if you're calling `cachedGenerateText` from somewhere, the result will stick for 5 min
- **Changes don't take effect** → make sure you saved via the admin panel (which writes to Redis), not just the local file
