import { readJSON, writeJSON, withLock } from "./blob-store"

interface ChatLogEntry {
  q: string
  a: string
  t: string
}

interface IpChatLog {
  totalChats: number
  lastActive: string
  recent: ChatLogEntry[]
}

type ChatLogs = Record<string, IpChatLog>

const FILE = "chat-logs.json"
const MAX_RECENT = 10

export async function logChat(ip: string, question: string, answer: string): Promise<void> {
  await withLock(FILE, async () => {
    const logs = await readJSON<ChatLogs>(FILE, {})
    const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" }).replace(" ", "T")

    if (!logs[ip]) {
      logs[ip] = { totalChats: 0, lastActive: now, recent: [] }
    }

    const entry = logs[ip]
    entry.totalChats++
    entry.lastActive = now
    entry.recent.push({
      q: question.slice(0, 80),
      a: answer.slice(0, 80),
      t: now,
    })

    if (entry.recent.length > MAX_RECENT) {
      entry.recent = entry.recent.slice(-MAX_RECENT)
    }

    await writeJSON(FILE, logs)
  })
}

export async function getChatLogs(): Promise<ChatLogs> {
  return await readJSON<ChatLogs>(FILE, {})
}
