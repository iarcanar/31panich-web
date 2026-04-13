import { GoogleGenAI, ThinkingLevel } from "@google/genai"

const MODEL_NAME = "gemini-3-flash-preview"

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
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens,
      // Gemini 3 Flash: thinking enabled — self-checks before answering
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
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
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  })
  return response.text ?? ""
}

export { MODEL_NAME }
