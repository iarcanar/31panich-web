import { readJSON, writeJSON } from "./blob-store"

interface AiConfig {
  instructions: string
}

const FILE = "ai-config.json"

export async function getAiConfig(): Promise<AiConfig> {
  return await readJSON<AiConfig>(FILE, { instructions: "" })
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await writeJSON(FILE, config)
}
