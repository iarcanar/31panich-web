import { readJSON, writeJSON, withLock } from "./blob-store"
import type { Reel } from "@/types/reel"

const FILE = "reels.json"

async function readAll(): Promise<Reel[]> {
  return await readJSON<Reel[]>(FILE, [])
}

async function writeAll(reels: Reel[]): Promise<void> {
  await writeJSON(FILE, reels)
}

export async function getReels(): Promise<Reel[]> {
  const all = await readAll()
  return all.sort((a, b) => a.order - b.order)
}

export async function getActiveReels(): Promise<Reel[]> {
  const all = await readAll()
  return all.filter((r) => r.active).sort((a, b) => a.order - b.order)
}

export async function getReelById(id: string): Promise<Reel | null> {
  const all = await readAll()
  return all.find((r) => r.id === id) || null
}

export type ReelInput = Omit<Reel, "id" | "createdAt" | "updatedAt">

export async function createReel(input: ReelInput): Promise<Reel> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const now = new Date().toISOString()
    const reel: Reel = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    }
    all.push(reel)
    await writeAll(all)
    return reel
  })
}

export async function updateReel(id: string, patch: Partial<ReelInput>): Promise<Reel | null> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() }
    await writeAll(all)
    return all[idx]
  })
}

export async function deleteReel(id: string): Promise<boolean> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return false
    all.splice(idx, 1)
    await writeAll(all)
    return true
  })
}

export async function reorderReels(orderedIds: string[]): Promise<void> {
  return withLock(FILE, async () => {
    const all = await readAll()
    const map = new Map(all.map((r) => [r.id, r]))
    const now = new Date().toISOString()
    orderedIds.forEach((id, i) => {
      const r = map.get(id)
      if (r) { r.order = i; r.updatedAt = now }
    })
    await writeAll(Array.from(map.values()))
  })
}
