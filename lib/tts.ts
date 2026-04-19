import { GoogleGenAI } from "@google/genai"

/**
 * Gemini TTS configuration — REST TTS models only (reads text verbatim).
 *
 * Hybrid strategy:
 *   primary  = gemini-3.1-flash-tts-preview   (nicer voice, newer)
 *   fallback = gemini-2.5-flash-preview-tts   (cheaper, faster, activated when 3.1 is rate-limited)
 *
 * On the first 429 / quota error from the primary, we retry with the fallback
 * within the same request so the user still gets audio. The TTS3.1 API key is
 * linked to paid billing in AI Studio, so both models get paid-tier limits.
 *
 * Voice: Orus (Speaker 1 — Firm, Lower middle pitch).
 *
 * Env: GEMINI31_TTS — separate from GEMINI_API_KEY so TTS quota issues never
 * impact chat.
 */
export const TTS_CONFIG = {
  primaryModel: "gemini-3.1-flash-tts-preview",
  fallbackModel: "gemini-2.5-flash-preview-tts",
  voice: "Orus",
  temperature: 1,
  scene: "A quiet, professional remote workspace.",
  styleHint: "Fast and short, Steady, efficient, and unhurried. Tone is empathetic, crisp, and reassuring.",
  /** Prepended to every reply before synthesis — nudges model toward consistent delivery. */
  inlineTag: "[natural]",
} as const

let client: GoogleGenAI | null = null

function getTtsClient(): GoogleGenAI {
  if (!client) {
    const key = process.env.GEMINI31_TTS
    if (!key) throw new Error("GEMINI31_TTS not set")
    client = new GoogleGenAI({ apiKey: key })
  }
  return client
}

function wrapStyledText(text: string): string {
  return `Scene: ${TTS_CONFIG.scene}\nStyle: ${TTS_CONFIG.styleHint}\n\n${TTS_CONFIG.inlineTag} ${text}`
}

/** Run a single TTS call against the given model and return raw PCM + sample rate. */
async function synthesizeWith(model: string, text: string): Promise<{ pcm: Buffer; sampleRate: number }> {
  const ai = getTtsClient()
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: wrapStyledText(text) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voice },
        },
      },
      temperature: TTS_CONFIG.temperature,
    },
  })

  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData
  if (!inlineData?.data) {
    throw new Error(`${model} returned no audio data`)
  }

  // mimeType is something like "audio/L16;codec=pcm;rate=24000"
  const mimeType = inlineData.mimeType || ""
  const rateMatch = mimeType.match(/rate=(\d+)/)
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000

  return { pcm: Buffer.from(inlineData.data, "base64"), sampleRate }
}

function isRateLimitError(err: unknown): boolean {
  const msg = String((err as Error | undefined)?.message ?? err).toLowerCase()
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted")
  )
}

/** Primary entry point. Tries the preferred model first; on a rate-limit /
 *  quota error, retries with the cheaper fallback model within the same
 *  request so the user still hears audio. Other errors propagate. */
export async function generateSpeech(text: string): Promise<{ pcm: Buffer; sampleRate: number }> {
  try {
    return await synthesizeWith(TTS_CONFIG.primaryModel, text)
  } catch (err) {
    if (!isRateLimitError(err)) throw err
    console.warn(
      `[tts] ${TTS_CONFIG.primaryModel} rate-limited, falling back to ${TTS_CONFIG.fallbackModel}:`,
      (err as Error)?.message
    )
    return synthesizeWith(TTS_CONFIG.fallbackModel, text)
  }
}

/** Wrap raw PCM 16-bit mono into a WAV container so the browser can play it. */
export function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = pcm.length

  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcm])
}

// ─── Thai number / time pronunciation helpers ───────────────────────────────

const THAI_NUMS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]

/** Convert integer 0–99 to spoken Thai (เจ็ด, สิบห้า, ยี่สิบ, สามสิบเอ็ด, ...). */
function thaiNumUnder100(n: number): string {
  if (n < 0 || n >= 100) return String(n)
  if (n < 10) return THAI_NUMS[n]
  if (n === 10) return "สิบ"
  if (n < 20) return n === 11 ? "สิบเอ็ด" : "สิบ" + THAI_NUMS[n - 10]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const tensWord = tens === 2 ? "ยี่สิบ" : THAI_NUMS[tens] + "สิบ"
  if (ones === 0) return tensWord
  if (ones === 1) return tensWord + "เอ็ด"
  return tensWord + THAI_NUMS[ones]
}

/** Render 24h time as colloquial spoken Thai (used for single-time form):
 *   7.30  → "เจ็ดโมงครึ่งเช้า"
 *   17.30 → "ห้าโมงครึ่งเย็น"
 *   12.00 → "เที่ยง"
 *   19.15 → "หนึ่งทุ่มสิบห้านาที"
 */
function thaiTimeWord(hour: number, min: number): string {
  if (hour < 0 || hour > 24 || min < 0 || min > 59) return ""

  let hourWord: string
  if (hour === 0 || hour === 24) hourWord = "เที่ยงคืน"
  else if (hour >= 1 && hour <= 5) hourWord = "ตี" + THAI_NUMS[hour]
  else if (hour === 6) hourWord = "หกโมงเช้า"
  else if (hour <= 11) hourWord = THAI_NUMS[hour] + "โมงเช้า"
  else if (hour === 12) hourWord = "เที่ยง"
  else if (hour === 13) hourWord = "บ่ายโมง"
  else if (hour <= 16) hourWord = "บ่าย" + THAI_NUMS[hour - 12] + "โมง"
  else if (hour <= 18) hourWord = THAI_NUMS[hour - 12] + "โมงเย็น"
  else if (hour === 19) hourWord = "หนึ่งทุ่ม"
  else if (hour <= 23) hourWord = THAI_NUMS[hour - 18] + "ทุ่ม"
  else hourWord = ""

  if (min === 0) return hourWord

  if (min === 30) {
    if (hourWord.endsWith("เย็น")) return hourWord.replace("เย็น", "ครึ่งเย็น")
    if (hourWord.endsWith("เช้า")) return hourWord.replace("เช้า", "ครึ่งเช้า")
    return hourWord + "ครึ่ง"
  }

  return hourWord + thaiNumUnder100(min) + "นาที"
}

/** Period-of-day prefix used for the natural "ตอน{period}{time}" range form.
 *  Returns "" when the hour already carries its own period cue
 *  (เที่ยง / ตี / ทุ่ม / เที่ยงคืน) so we don't stack redundant words. */
function periodPrefix(hour: number): string {
  if (hour >= 6 && hour <= 11) return "เช้า"
  if (hour >= 13 && hour <= 16) return "บ่าย"
  if (hour >= 17 && hour <= 18) return "เย็น"
  return ""
}

/** Hour+minute without the period word — the "bare" time body used inside the
 *  range template where the period is emitted as a separate prefix. */
function thaiTimeBare(hour: number, min: number): string {
  if (hour < 0 || hour > 24 || min < 0 || min > 59) return ""

  let hourWord: string
  if (hour === 0 || hour === 24) hourWord = "เที่ยงคืน"
  else if (hour >= 1 && hour <= 5) hourWord = "ตี" + THAI_NUMS[hour]
  else if (hour === 12) hourWord = "เที่ยง"
  else if (hour === 13) hourWord = "โมง"                              // from บ่ายโมง
  else if (hour >= 14 && hour <= 16) hourWord = THAI_NUMS[hour - 12] + "โมง"
  else if (hour >= 6 && hour <= 11) hourWord = THAI_NUMS[hour] + "โมง"
  else if (hour >= 17 && hour <= 18) hourWord = THAI_NUMS[hour - 12] + "โมง"
  else if (hour === 19) hourWord = "หนึ่งทุ่ม"
  else if (hour <= 23) hourWord = THAI_NUMS[hour - 18] + "ทุ่ม"
  else hourWord = ""

  if (min === 0) return hourWord
  if (min === 30) return hourWord + "ครึ่ง"
  return hourWord + thaiNumUnder100(min) + "นาที"
}

/** Build the natural shop-hours range phrase:
 *    7.30 – 17.30  → "ตอนเช้าเจ็ดโมงครึ่ง ปิดตอนเย็น ห้าโมงครึ่ง"
 *    8.00 – 12.00  → "ตอนเช้าแปดโมง ปิดเที่ยง"   (no period prefix for เที่ยง)
 *    13.00 – 19.00 → "ตอนบ่ายโมง ปิดหนึ่งทุ่ม"   (ทุ่ม already carries night)
 */
function thaiTimeRange(h1: number, m1: number, h2: number, m2: number): string {
  const p1 = periodPrefix(h1)
  const p2 = periodPrefix(h2)
  const t1 = thaiTimeBare(h1, m1)
  const t2 = thaiTimeBare(h2, m2)
  const start = p1 ? `ตอน${p1}${t1}` : t1
  const end = p2 ? `ปิดตอน${p2} ${t2}` : `ปิด${t2}`
  return `${start} ${end}`
}

/** Convert Thai time-of-day strings to spoken form before TTS synthesis.
 *  Requires the "น." (or "น") suffix as a disambiguator so pure decimals
 *  ("ราคา 7.30 บาท") are NOT mangled into time readings.
 */
export function normalizeThaiTimes(text: string): string {
  // Range with suffix: "7.30 – 17.30 น." → "ตอนเช้าเจ็ดโมงครึ่ง ปิดตอนเย็น ห้าโมงครึ่ง"
  let out = text.replace(
    /(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*น\.?/g,
    (_, h1: string, m1: string, h2: string, m2: string) =>
      thaiTimeRange(+h1, +m1, +h2, +m2)
  )
  // Remaining single time with suffix: "8.00 น." → "แปดโมงเช้า"
  out = out.replace(
    /(\d{1,2})[.:](\d{2})\s*น\.?/g,
    (_, h: string, m: string) => thaiTimeWord(+h, +m)
  )
  return out
}

// ─── Brand pronunciation overrides ───────────────────────────────────────
// English brand names that Gemini TTS routinely mispronounces when reading
// Thai sentences. We rewrite them to a Thai phonetic spelling BEFORE sending
// to the model so the resulting speech sounds right to Thai ears.
//
// Rules:
//   - case-insensitive (`i` flag)
//   - `\b` word boundaries handle spaces + Thai-adjacent positions (since \b
//     in JS regex triggers between ASCII word chars and everything else,
//     Thai characters count as "everything else" → boundary works correctly)
//   - Order matters: put compound patterns like "Dongcheng(DC)" BEFORE the
//     standalone ones so they're consumed first.
const BRAND_PRONUNCIATIONS: Array<[RegExp, string]> = [
  // ─── Shop name — MUST be matched before bare domain/brand patterns ───
  // Full URL (with optional www.) — spell out TLD the way Thais say it.
  [/\b(?:www\.)?31panich\.co\.th\b/gi, "สามหนึ่งพานิช ดอทซีโอ ดอท ทีเอช"],
  // Bare brand slug (no TLD) — e.g. "แบรนด์ 31panich"
  [/\b31panich\b/gi, "สามหนึ่งพานิช"],

  // ─── Supplier / product brands ───
  // "Dongcheng (DC)" / "Dongcheng(DC)" / "Dongcheng DC" — collapse to ดีซี
  [/\bdongcheng\s*\(?\s*dc\s*\)?/gi, "ดีซี"],
  [/\bdongcheng\b/gi, "ดีซี"],
  [/\bbeger\b/gi, "เบเย่อ"],
  [/\bstanley\b/gi, "แสตนเล่"],
  [/\bpumpkin\b/gi, "พัมคิ่น"],
  [/\bhiet\b/gi, "ไฮเอ็ด"],
  [/\bbewon\b/gi, "บีวัน"],
  // Standalone "DC" — only after the compound form is consumed above.
  // Guard against false positives like "DC current" / "DCAE" by requiring
  // it not be followed by letters (so "DC motor" won't match but "DC"
  // alone or in a product listing will).
  [/\bDC\b(?![a-zA-Z])/g, "ดีซี"],
]

/** Replace English brand names with their Thai phonetic spelling so TTS
 *  reads them the way customers expect. Extend this list as more brands
 *  are added to the catalog — see `lib/tts.ts` BRAND_PRONUNCIATIONS. */
export function normalizeBrandPronunciation(text: string): string {
  let out = text
  for (const [pattern, replacement] of BRAND_PRONUNCIATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

/** Strip markdown, links, internal tags, and collapse whitespace for clean TTS input.
 *  Also normalizes Thai time strings (e.g. "7.30 น.") into spoken form so Gemini
 *  doesn't read them digit-by-digit, and rewrites brand names to Thai phonetics. */
export function cleanForTTS(text: string): string {
  return normalizeBrandPronunciation(normalizeThaiTimes(text))
    .replace(/\*\*([^*]+)\*\*/g, "$1")          // bold **text**
    .replace(/\*([^*]+)\*/g, "$1")              // italic *text*
    .replace(/`([^`]+)`/g, "$1")                // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")    // [label](url) → label
    .replace(/\[(?:SEARCH|SUGGEST):[^\]]+\]/gi, "")  // internal action tags (belt-and-suspenders; server already strips)
    .replace(/https?:\/\/\S+/g, "")             // bare URLs
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
