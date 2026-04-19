// @ts-check
/**
 * Pre-generates WAV files for frequently-asked chat replies so the client
 * can skip /api/ai/tts entirely for cached phrases.
 *
 * Run from web/:
 *   node scripts/gen-tts-cache.mjs
 *
 * Needs GEMINI31_TTS in .env.local (same key as the live TTS route).
 *
 * NOTE: The Thai-time / brand-pronunciation rules are MIRRORED from
 * lib/tts.ts so the generator and the live server produce byte-identical
 * WAVs for the same input text. If you change lib/tts.ts, update here too.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { GoogleGenAI } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, "..")
const OUT_DIR = join(PROJECT_ROOT, "public", "audio", "tts")

// ── Load .env.local into process.env ───────────────────────
const envPath = join(PROJECT_ROOT, ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/i)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1")
    }
  }
}

const KEY = process.env.GEMINI31_TTS
if (!KEY) {
  console.error("GEMINI31_TTS not set (expected in .env.local or environment)")
  process.exit(1)
}

// ── Constants (mirror lib/store-config.ts) ─────────────────
const HOURS_TEXT = "7.30 – 17.30 น."
const STORE_LANDMARK = "ตรงข้ามตลาดเสาธง หน้าค่ายพหลโยธิน (ศูนย์ปืนใหญ่) ลพบุรี"

// ── TTS config (mirror lib/tts.ts) ─────────────────────────
const TTS_CONFIG = {
  primaryModel: "gemini-3.1-flash-tts-preview",
  fallbackModel: "gemini-2.5-flash-preview-tts",
  voice: "Orus",
  temperature: 1,
  scene: "A quiet, professional remote workspace.",
  styleHint: "Fast and short, Steady, efficient, and unhurried. Tone is empathetic, crisp, and reassuring.",
  inlineTag: "[natural]",
}

// ── Thai number / time preprocessing (mirror lib/tts.ts) ───
const THAI_NUMS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]

function thaiNumUnder100(n) {
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

function periodPrefix(hour) {
  if (hour >= 6 && hour <= 11) return "เช้า"
  if (hour >= 13 && hour <= 16) return "บ่าย"
  if (hour >= 17 && hour <= 18) return "เย็น"
  return ""
}

function thaiTimeBare(hour, min) {
  if (hour < 0 || hour > 24 || min < 0 || min > 59) return ""
  let hourWord
  if (hour === 0 || hour === 24) hourWord = "เที่ยงคืน"
  else if (hour >= 1 && hour <= 5) hourWord = "ตี" + THAI_NUMS[hour]
  else if (hour === 12) hourWord = "เที่ยง"
  else if (hour === 13) hourWord = "โมง"
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

function thaiTimeRange(h1, m1, h2, m2) {
  const p1 = periodPrefix(h1)
  const p2 = periodPrefix(h2)
  const t1 = thaiTimeBare(h1, m1)
  const t2 = thaiTimeBare(h2, m2)
  const start = p1 ? `ตอน${p1}${t1}` : t1
  const end = p2 ? `ปิดตอน${p2} ${t2}` : `ปิด${t2}`
  return `${start} ${end}`
}

function normalizeThaiTimes(text) {
  return text.replace(
    /(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*น\.?/g,
    (_, h1, m1, h2, m2) => thaiTimeRange(+h1, +m1, +h2, +m2),
  )
}

function cleanForTTS(text) {
  return normalizeThaiTimes(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[(?:SEARCH|SUGGEST):[^\]]+\]/gi, "")
    .replace(/\[MAP\]/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// ── WAV container (mirror lib/tts.ts pcmToWav) ─────────────
function pcmToWav(pcm, sampleRate) {
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
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

// ── Synthesis ──────────────────────────────────────────────
function wrapStyledText(text) {
  return `Scene: ${TTS_CONFIG.scene}\nStyle: ${TTS_CONFIG.styleHint}\n\n${TTS_CONFIG.inlineTag} ${text}`
}

function isRateLimit(err) {
  const msg = String(err?.message ?? err).toLowerCase()
  return msg.includes("429") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("resource_exhausted")
}

async function synthesize(ai, model, text) {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: wrapStyledText(text) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voice } },
      },
      temperature: TTS_CONFIG.temperature,
    },
  })
  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData
  if (!inlineData?.data) throw new Error(`${model} returned no audio data`)
  const mimeType = inlineData.mimeType || ""
  const rateMatch = mimeType.match(/rate=(\d+)/)
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000
  return { pcm: Buffer.from(inlineData.data, "base64"), sampleRate }
}

async function generateSpeech(ai, text) {
  try {
    return await synthesize(ai, TTS_CONFIG.primaryModel, text)
  } catch (err) {
    if (!isRateLimit(err)) throw err
    console.warn(`[fallback] ${TTS_CONFIG.primaryModel} rate-limited → ${TTS_CONFIG.fallbackModel}`)
    return synthesize(ai, TTS_CONFIG.fallbackModel, text)
  }
}

// ── Phrases to cache ───────────────────────────────────────
const PHRASES = [
  { file: "hours-open.wav", text: `ร้านเปิดทุกวัน ${HOURS_TEXT} ครับ` },
  { file: "no-holiday.wav", text: `ตอนนี้ไม่มีวันหยุดพิเศษครับ ร้านเปิดบริการทุกวัน ${HOURS_TEXT} ครับ` },
  { file: "location.wav", text: `ร้านอยู่${STORE_LANDMARK}ครับ กดเพื่อนำทางได้เลยครับ` },
]

// ── Run ────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true })
const ai = new GoogleGenAI({ apiKey: KEY })

for (const { file, text } of PHRASES) {
  const cleaned = cleanForTTS(text)
  console.log(`\n[gen] ${file}`)
  console.log(`      raw:     "${text}"`)
  console.log(`      cleaned: "${cleaned}"`)
  const { pcm, sampleRate } = await generateSpeech(ai, cleaned)
  const wav = pcmToWav(pcm, sampleRate)
  const outPath = join(OUT_DIR, file)
  writeFileSync(outPath, wav)
  console.log(`      ✓ ${wav.length} bytes @ ${sampleRate}Hz`)
}

console.log(`\nDone. ${PHRASES.length} files in ${OUT_DIR}`)
