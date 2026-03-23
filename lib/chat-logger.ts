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

// Disabled to save Blob operations — AI works the same without logging
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function logChat(_ip: string, _question: string, _answer: string): Promise<void> {
  // no-op: chat logging disabled to conserve Vercel Blob free tier
}

export async function getChatLogs(): Promise<ChatLogs> {
  return await readJSON<ChatLogs>(FILE, {})
}
