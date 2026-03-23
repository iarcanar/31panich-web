import fs from "fs"
import path from "path"

interface KnowledgeTopic {
  file: string
  triggers: string[]
}

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge")

const TOPICS: KnowledgeTopic[] = [
  {
    file: "points.txt",
    triggers: ["แต้ม", "แลกแต้ม", "แต้มสามหนึ่ง", "รับแต้ม", "ของแลกแต้ม", "สะสมแต้ม", "รางวัล", "แลกของ", "point", "reward"],
  },
]

/** Check user message for trigger keywords and return matching knowledge text */
export function getRelevantKnowledge(userMessage: string): string {
  const msg = userMessage.toLowerCase()
  const matched: string[] = []

  for (const topic of TOPICS) {
    if (topic.triggers.some((t) => msg.includes(t))) {
      try {
        const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, topic.file), "utf-8")
        matched.push(content.trim())
      } catch { /* file not found, skip */ }
    }
  }

  return matched.length > 0
    ? "\n\nข้อมูลเพิ่มเติมที่เกี่ยวข้องกับคำถาม:\n" + matched.join("\n\n")
    : ""
}
