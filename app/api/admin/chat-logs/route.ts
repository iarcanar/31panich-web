import { NextResponse } from "next/server"
import { getChatLogs } from "@/lib/chat-logger"

export async function GET() {
  return NextResponse.json(await getChatLogs())
}
