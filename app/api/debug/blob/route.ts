import { NextResponse } from "next/server"

export async function GET() {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
  const tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 20) || "(not set)"

  const checks: Record<string, unknown> = {
    hasToken,
    tokenPrefix: hasToken ? tokenPrefix + "..." : "(not set)",
    nodeEnv: process.env.NODE_ENV,
  }

  // Try blob list if token exists
  if (hasToken) {
    try {
      const { list } = await import("@vercel/blob")
      const { blobs } = await list({ prefix: "data/", limit: 10 })
      checks.blobCount = blobs.length
      checks.blobs = blobs.map((b) => ({ pathname: b.pathname, size: b.size }))
    } catch (err) {
      checks.blobError = err instanceof Error ? err.message : String(err)
    }

    // Try a test write + read
    try {
      const { put } = await import("@vercel/blob")
      const testData = JSON.stringify({ test: true, ts: Date.now() })
      const result = await put("data/_test.json", testData, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      })
      checks.writeTest = { ok: true, url: result.url }
    } catch (err) {
      checks.writeTest = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  return NextResponse.json(checks)
}
