import { randomUUID } from "crypto"

interface ChatSession {
  id: string
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>
  lastActivity: number
}

const sessions = new Map<string, ChatSession>()
const MAX_SESSIONS = 50
const SESSION_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_HISTORY_TURNS = 10 // 10 pairs = 20 messages

function cleanup() {
  const now = Date.now()
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL) sessions.delete(id)
  }
}

export function createSession(): { sessionId: string } | { queued: true } {
  cleanup()
  if (sessions.size >= MAX_SESSIONS) return { queued: true }
  const id = randomUUID()
  sessions.set(id, { id, history: [], lastActivity: Date.now() })
  return { sessionId: id }
}

export function getSession(id: string): ChatSession | null {
  cleanup()
  const s = sessions.get(id)
  if (!s) return null
  s.lastActivity = Date.now()
  return s
}

export function addToHistory(id: string, role: "user" | "model", text: string) {
  const s = sessions.get(id)
  if (!s) return
  s.history.push({ role, parts: [{ text }] })
  // Keep last MAX_HISTORY_TURNS pairs (always keep from end)
  while (s.history.length > MAX_HISTORY_TURNS * 2) {
    s.history.splice(0, 2) // remove oldest pair
  }
}

export function deleteSession(id: string) {
  sessions.delete(id)
}
