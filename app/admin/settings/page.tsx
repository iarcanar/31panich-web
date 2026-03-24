"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../layout"
import { useRouter } from "next/navigation"

// ─── Config: อัพเดตเมื่อต่ออายุ ─────────────────────────
const HOSTING = {
  provider: "Thnic",
  manageUrl: "https://thdomain.thnic.co.th/mydomain/266562",
  expiryDate: "2027-03-22",        // ← อัพเดตวันหมดอายุที่นี่
  pricePerYear: 850,
  package: "Hosting + Domain .co.th",
}

const LINKS = {
  vercel: "https://vercel.com/teeiarcanar-9511s-projects",
  github: "https://github.com/iarcanar/31panich-web",
  domain: "31panich.co.th",
}

const STACK = [
  { name: "Next.js", version: "16", color: "text-white" },
  { name: "React", version: "19", color: "text-cyan-400" },
  { name: "TypeScript", version: "5", color: "text-blue-400" },
  { name: "Tailwind CSS", version: "3", color: "text-teal-400" },
  { name: "Upstash Redis", version: "", color: "text-red-400" },
  { name: "Gemini AI", version: "2.5-flash", color: "text-amber-400" },
]

// ─── Types ───────────────────────────────────────────────
interface Deployment {
  uid: string
  url: string
  state: string
  created: number
  meta?: { githubCommitMessage?: string }
}

interface VercelData {
  configured: boolean
  deployments?: Deployment[]
  usage?: Record<string, unknown>
  plan?: { name: string; username: string }
  error?: string
}

interface UpstashData {
  configured: boolean
  memory?: { used: number; limit: number; usedMB: number; limitMB: number }
  keys?: number
  dailyCommands?: { used: number; limit: number }
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────
function daysUntil(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

function formatCountdown(dateStr: string) {
  const days = daysUntil(dateStr)
  if (days < 0) return { text: `หมดอายุแล้ว ${Math.abs(days)} วัน`, urgent: true }
  const months = Math.floor(days / 30)
  const remainDays = days % 30
  if (months > 0) return { text: `${months} เดือน ${remainDays} วัน`, urgent: days <= 60 }
  return { text: `${days} วัน`, urgent: true }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  })
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "เมื่อสักครู่"
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  const days = Math.floor(hrs / 24)
  return `${days} วันที่แล้ว`
}

const STATE_MAP: Record<string, { label: string; color: string }> = {
  READY: { label: "Ready", color: "bg-emerald-500" },
  ERROR: { label: "Error", color: "bg-red-500" },
  BUILDING: { label: "Building", color: "bg-amber-500" },
  QUEUED: { label: "Queued", color: "bg-blue-500" },
  CANCELED: { label: "Canceled", color: "bg-gray-500" },
  INITIALIZING: { label: "Init", color: "bg-blue-400" },
}

// ─── Component ───────────────────────────────────────────
export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [vercel, setVercel] = useState<VercelData | null>(null)
  const [loadingVercel, setLoadingVercel] = useState(true)
  const [upstash, setUpstash] = useState<UpstashData | null>(null)
  const [loadingUpstash, setLoadingUpstash] = useState(true)

  // Admin-only guard
  useEffect(() => {
    if (user && !isAdmin) router.push("/admin")
  }, [user, isAdmin, router])

  // Fetch Vercel + Upstash data
  useEffect(() => {
    fetch("/api/admin/vercel-status")
      .then((r) => r.json())
      .then(setVercel)
      .catch(() => setVercel({ configured: false, error: "fetch failed" }))
      .finally(() => setLoadingVercel(false))

    fetch("/api/admin/upstash-status")
      .then((r) => r.json())
      .then(setUpstash)
      .catch(() => setUpstash({ configured: false, error: "fetch failed" }))
      .finally(() => setLoadingUpstash(false))
  }, [])

  if (user && !isAdmin) return null

  const countdown = formatCountdown(HOSTING.expiryDate)
  const hostingDays = daysUntil(HOSTING.expiryDate)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ตั้งค่าระบบ
        </h1>
        <p className="text-xs text-white/40 mt-1">Infrastructure & Tech Stack Overview</p>
      </div>

      {/* ─── Row 1: Site Info + Tech Stack ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Site Info */}
        <Card title="Site Info" icon="globe">
          <div className="space-y-2.5">
            <InfoRow label="Domain" value={LINKS.domain} />
            <InfoRow label="Version" value={`v${process.env.NEXT_PUBLIC_APP_VERSION || "1.4.x"}`} />
            <InfoRow label="Branch" value="main" />
            <InfoRow label="Platform" value="Vercel (Hobby)" />
            <InfoRow label="Database" value="Upstash Redis" />
            <InfoRow label="AI Model" value="Gemini 2.5 Flash" />
          </div>
        </Card>

        {/* Tech Stack */}
        <Card title="Tech Stack" icon="stack">
          <div className="space-y-1.5">
            {STACK.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className={`text-xs font-medium ${s.color}`}>{s.name}</span>
                {s.version && (
                  <span className="text-[10px] text-white/30 font-mono">{s.version}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Row 2: Hosting ─── */}
      <Card title={`Hosting — ${HOSTING.provider}`} icon="server" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Countdown */}
          <div className={`rounded-xl p-4 border ${
            countdown.urgent
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/20"
          }`}>
            <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">เหลืออีก</p>
            <p className={`text-lg font-bold ${countdown.urgent ? "text-red-400" : "text-emerald-400"}`}>
              {countdown.text}
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              หมดอายุ {formatDate(HOSTING.expiryDate)}
            </p>
          </div>

          {/* Package */}
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">แพ็คเกจ</p>
            <p className="text-lg font-bold text-white">
              {HOSTING.pricePerYear.toLocaleString()}<span className="text-xs text-white/40 font-normal"> บาท/ปี</span>
            </p>
            <p className="text-[10px] text-white/30 mt-1">{HOSTING.package}</p>
          </div>

          {/* Progress bar */}
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">อายุที่ใช้ไป</p>
            {(() => {
              const totalDays = 365
              const used = totalDays - Math.max(0, hostingDays)
              const pct = Math.min(100, Math.round((used / totalDays) * 100))
              return (
                <>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-lg font-bold text-white">{pct}%</span>
                    <span className="text-[10px] text-white/30 mb-0.5">of 1 year</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <ExtLink href={HOSTING.manageUrl}>จัดการ Hosting</ExtLink>
        </div>
      </Card>

      {/* ─── Row 3: Upstash Redis ─── */}
      <Card title="Upstash Redis" icon="redis" className="mb-4">
        {loadingUpstash ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !upstash?.configured ? (
          <p className="text-xs text-white/40">ยังไม่ได้ตั้งค่า Upstash env vars</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Memory */}
            {upstash.memory && (() => {
              const pct = upstash.memory.limitMB > 0
                ? Math.min(100, Math.round((upstash.memory.usedMB / upstash.memory.limitMB) * 100))
                : 0
              return (
                <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Memory</p>
                  <p className="text-lg font-bold text-white">
                    {upstash.memory.usedMB}<span className="text-xs text-white/40 font-normal"> / {upstash.memory.limitMB} MB</span>
                  </p>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 mt-1">{pct}% used</p>
                </div>
              )
            })()}

            {/* Daily Commands */}
            {upstash.dailyCommands && (() => {
              const pct = upstash.dailyCommands.limit > 0
                ? Math.min(100, Math.round((upstash.dailyCommands.used / upstash.dailyCommands.limit) * 100))
                : 0
              return (
                <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Commands วันนี้</p>
                  <p className="text-lg font-bold text-white">
                    {upstash.dailyCommands.used.toLocaleString()}<span className="text-xs text-white/40 font-normal"> / {upstash.dailyCommands.limit.toLocaleString()}</span>
                  </p>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 mt-1">{pct}% used</p>
                </div>
              )
            })()}

            {/* Keys */}
            <div className="rounded-xl p-4 bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Keys</p>
              <p className="text-lg font-bold text-white">{(upstash.keys || 0).toLocaleString()}</p>
              <p className="text-[10px] text-white/25 mt-1">records in database</p>
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <ExtLink href="https://vercel.com/teeiarcanar-9511s-projects/~/integrations/upstash/icfg_4oNuiVOTqUo00P1HrGVHcNPh/resources/storage/store_Vo58V26BNz4Rf4jI/guides">Upstash Console</ExtLink>
        </div>
      </Card>

      {/* ─── Row 4: Vercel + GitHub ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Vercel */}
        <Card title="Vercel" icon="vercel">
          {loadingVercel ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !vercel?.configured ? (
            <div className="text-xs text-white/40">
              <p className="mb-2">ยังไม่ได้ตั้งค่า VERCEL_TOKEN</p>
              <p className="text-[10px] text-white/25">
                ไปที่ Vercel Dashboard → Settings → Tokens → สร้าง token แล้วเพิ่มใน Environment Variables
              </p>
            </div>
          ) : (
            <div>
              {/* Plan info */}
              {vercel.plan && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-white/40">Plan:</span>
                  <span className="text-xs font-medium text-white capitalize">{vercel.plan.name}</span>
                  {vercel.plan.username && (
                    <span className="text-[10px] text-white/25">@{vercel.plan.username}</span>
                  )}
                </div>
              )}

              {/* Quota/Usage */}
              {vercel.usage && <VercelUsage data={vercel.usage} />}

              {/* Recent deployments */}
              {vercel.deployments && vercel.deployments.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">Deploy ล่าสุด</p>
                  <div className="space-y-1.5">
                    {vercel.deployments.map((d) => {
                      const s = STATE_MAP[d.state] || { label: d.state, color: "bg-gray-500" }
                      return (
                        <div key={d.uid} className="flex items-center gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.color}`} />
                          <span className="text-white/60 truncate flex-1">
                            {d.meta?.githubCommitMessage || d.url || d.uid.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-white/25 shrink-0">{timeAgo(d.created)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <ExtLink href={LINKS.vercel}>Dashboard</ExtLink>
          </div>
        </Card>

        {/* GitHub */}
        <Card title="GitHub" icon="github">
          <div className="space-y-2.5">
            <InfoRow label="Repository" value="iarcanar/31panich-web" />
            <InfoRow label="Branch" value="main" />
            <InfoRow label="Visibility" value="Private" />
            <InfoRow label="Auto Deploy" value="git push → Vercel" />
          </div>
          <div className="mt-4 flex gap-2">
            <ExtLink href={LINKS.github}>เปิด Repository</ExtLink>
            <ExtLink href={`${LINKS.github}/commits/main`}>Commits</ExtLink>
          </div>
        </Card>
      </div>

      {/* ─── Row 5: Quick Reference ─── */}
      <Card title="Quick Reference" icon="book">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label="Admin Login" value="/admin/login" />
          <InfoRow label="API Base" value="/api/*" />
          <InfoRow label="Store Config" value="lib/store-config.ts" />
          <InfoRow label="AI Config" value="data/ai-config.json" />
          <InfoRow label="Products Data" value="data/products.json" />
          <InfoRow label="Coupons Data" value="data/coupons.json" />
          <InfoRow label="Promotions" value="data/promotions.json" />
          <InfoRow label="Categories" value="lib/categories.ts (15)" />
        </div>
      </Card>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────

function Card({ title, icon, className = "", children }: {
  title: string; icon: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl bg-[#13131d] border border-white/10 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <CardIcon type={icon} />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-xs text-white/70 font-mono">{value}</span>
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
    >
      {children}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    </a>
  )
}

function VercelUsage({ data }: { data: Record<string, unknown> }) {
  // Vercel usage API response varies — try to extract bandwidth/functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  const metrics: { label: string; used: number; limit: number; unit: string }[] = []

  // Try common Vercel usage response shapes
  if (d.bandwidth) {
    metrics.push({
      label: "Bandwidth",
      used: Math.round((d.bandwidth.used || 0) / (1024 * 1024 * 1024) * 100) / 100,
      limit: Math.round((d.bandwidth.limit || 100 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)),
      unit: "GB",
    })
  }
  if (d.serverlessFunctionExecution) {
    metrics.push({
      label: "Serverless",
      used: Math.round((d.serverlessFunctionExecution.used || 0) / 3600 * 100) / 100,
      limit: Math.round((d.serverlessFunctionExecution.limit || 100 * 3600) / 3600),
      unit: "GB-Hrs",
    })
  }
  if (d.imageOptimization) {
    metrics.push({
      label: "Image Opt",
      used: d.imageOptimization.used || 0,
      limit: d.imageOptimization.limit || 1000,
      unit: "images",
    })
  }

  if (metrics.length === 0) return null

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[10px] text-white/40 uppercase tracking-wider">Quota เดือนนี้</p>
      {metrics.map((m) => {
        const pct = m.limit > 0 ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0
        return (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-white/50">{m.label}</span>
              <span className="text-[10px] text-white/30">
                {m.used} / {m.limit} {m.unit}
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 text-white/40"
  switch (type) {
    case "globe":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" /></svg>
    case "stack":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25" /></svg>
    case "server":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" /></svg>
    case "redis":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2.661l.54.997-1.797.644 2.409.218.748 1.246.467-1.08 2.237-.234-1.665-.749.44-.875-1.725.57-1.654-.737zm4.264 3.598l3.484 1.441-7.262 2.986L3.724 7.7l3.228-1.339.279.107 2.283.929 1.648-.562 3.602-1.576zm6.196 2.563l-4.985 2.036v5.088l4.985-2.243V8.822zM9.262 15.705v-5.12L3.04 8.204v5.093l6.223 2.408zm.857-5.482l5.145-2.072-5.145-2.123-5.017 2.153 5.017 2.042z" /></svg>
    case "vercel":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L24 22H0L12 1z" /></svg>
    case "github":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
    case "book":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
    default:
      return null
  }
}
