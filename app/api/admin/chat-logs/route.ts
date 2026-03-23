import { NextResponse } from "next/server"
import { getChatLogs } from "@/lib/chat-logger"

export async function GET() {
  try {
    return NextResponse.json(await getChatLogs())
  } catch (err) {
    console.error("[api/chat-logs/GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
