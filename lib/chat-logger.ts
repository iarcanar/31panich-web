import { readJSON, writeJSON, withLock } from "./blob-store"

/** Stats-only log: no conversation content stored */
interface IpChatLog {
  totalChats: number
  firstSeen: string
  lastActive: string
}

type ChatLogs = Record<string, IpChatLog>

const FILE = "chat-logs.json"

function anonymizeIp(ip: string): string {
  if (!ip) return "unknown"
  // IPv6-mapped IPv4: ::ffff:192.168.1.100 → ::ffff:192.168.1.x
  const v4match = ip.match(/::ffff:(\d+\.\d+\.\d+)\.\d+/)
  if (v4match) return `::ffff:${v4match[1]}.x`
  // IPv4: 192.168.1.100 → 192.168.1.x
  const parts = ip.split(".")
  if (parts.length === 4) {
    parts[3] = "x"
    return parts.join(".")
  }
  // Other IPv6: truncate
  return ip.slice(0, 20) + "…"
}

/** Record one chat interaction — stores only IP (anonymized) + count + timestamps */
export async function logChat(ip: string): Promise<void> {
  return withLock(FILE, async () => {
    const logs = await readJSON<ChatLogs>(FILE, {})
    const key = anonymizeIp(ip)
    const now = new Date().toISOString()
    const existing = logs[key]
    logs[key] = {
      totalChats: (existing?.totalChats ?? 0) + 1,
      firstSeen: existing?.firstSeen ?? now,
      lastActive: now,
    }
    await writeJSON(FILE, logs)
  })
}

export async function getChatLogs(): Promise<ChatLogs> {
  return await readJSON<ChatLogs>(FILE, {})
}
