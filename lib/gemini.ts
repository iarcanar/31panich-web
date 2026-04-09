import { GoogleGenAI } from "@google/genai"

const MODEL_NAME = "gemini-2.5-flash"

let client: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error("GEMINI_API_KEY not set")
    client = new GoogleGenAI({ apiKey: key })
  }
  return client
}

export async function generateText(
  systemInstruction: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  maxOutputTokens = 2048
): Promise<string> {
  const ai = getGeminiClient()
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction,
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens,
      // Disable thinking — chat doesn't need deep reasoning, saves token budget for visible text
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  // Detect truncation and log warning (helps diagnose future issues)
  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== "STOP") {
    console.warn(`[gemini] finishReason=${finishReason} — response may be truncated (maxOutputTokens=${maxOutputTokens})`)
  }

  return response.text ?? ""
}

/** Generate text with Google Search grounding — for researching product info */
export async function generateTextWithSearch(
  systemInstruction: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  maxOutputTokens = 1024
): Promise<string> {
  const ai = getGeminiClient()
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction,
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens,
      tools: [{ googleSearch: {} }],
    },
  })
  return response.text ?? ""
}

export { MODEL_NAME }
