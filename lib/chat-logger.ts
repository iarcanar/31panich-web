import fs from "fs"
import path from "path"

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

const DATA_PATH = path.join(process.cwd(), "data", "chat-logs.json")
const MAX_RECENT = 10

function readAll(): ChatLogs {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeAll(logs: ChatLogs) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(logs, null, 2), "utf-8")
}

export function logChat(ip: string, question: string, answer: string): void {
  const logs = readAll()
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

  writeAll(logs)
}

export function getChatLogs(): ChatLogs {
  return readAll()
}
