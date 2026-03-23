import fs from "fs"
import path from "path"

interface AiConfig {
  instructions: string
}

const CONFIG_PATH = path.join(process.cwd(), "data", "ai-config.json")

export function getAiConfig(): AiConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    return { instructions: "" }
  }
}

export function saveAiConfig(config: AiConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
