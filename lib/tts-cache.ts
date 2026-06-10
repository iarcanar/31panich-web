import { HOURS_TEXT, STORE_LANDMARK } from "./store-config"

/**
 * Static WAV cache for frequently-asked replies.
 *
 * When a reply text matches one of the keys below, the client plays the
 * pre-generated WAV directly from `public/audio/tts/...` and skips the
 * `/api/ai/tts` round-trip entirely. Instant playback, zero API cost.
 *
 * Only add entries here when the reply text is produced by a DETERMINISTIC
 * pipeline (A2a, A2b, A3, ...) — AI-generated replies vary run-to-run and
 * will cache-miss / audio-mismatch the text.
 *
 * To regenerate after changing a phrase: `node scripts/gen-tts-cache.mjs`
 * then commit the new WAV files.
 */
export const CACHED_TTS_REPLIES: Record<string, string> = {
  [`ร้านเปิดทุกวัน ${HOURS_TEXT} ครับ`]: "/audio/tts/hours-open.wav",
  [`ตอนนี้ไม่มีวันหยุดพิเศษครับ ร้านเปิดบริการทุกวัน ${HOURS_TEXT} ครับ`]: "/audio/tts/no-holiday.wav",
  [`ร้านอยู่${STORE_LANDMARK}ครับ กดเพื่อนำทางได้เลยครับ`]: "/audio/tts/location.wav",
  // Pipeline D — campaign chip answer. Text mirrors `answer` ใน lib/campaigns.ts
  // (admin แก้ answer ได้ → cache miss → fallback ไป /api/ai/tts ตามปกติ)
  ['ร่วมครับ ร้านสามหนึ่งเข้าร่วม "ไทยช่วยไทย พลัส" แล้ว\nใช้สิทธิ์ผ่านแอปเป๋าตังที่หน้าร้านได้เลยครับ']: "/audio/tts/campaign-thaichuaythai.wav",
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** Return static WAV URL if this reply is in the cache, else undefined. */
export function lookupCachedTts(reply: string): string | undefined {
  const key = normalize(reply)
  for (const [k, v] of Object.entries(CACHED_TTS_REPLIES)) {
    if (normalize(k) === key) return v
  }
  return undefined
}
