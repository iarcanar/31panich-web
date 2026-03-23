import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { writeFile } from "@/lib/blob-store"

const MAX_WIDTH = 800
const QUALITY = 80

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "No valid image file" }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Process with sharp: resize + convert to WebP
    const processed = await sharp(buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()

    // Save via blob-store (blob on production, local fs on dev)
    const filename = `${crypto.randomUUID()}.webp`
    const url = await writeFile(`products/${filename}`, processed, "image/webp")

    const originalKB = Math.round(buffer.length / 1024)
    const optimizedKB = Math.round(processed.length / 1024)

    return NextResponse.json({
      url,
      originalSize: `${originalKB} KB`,
      optimizedSize: `${optimizedKB} KB`,
      saved: `${Math.round((1 - processed.length / buffer.length) * 100)}%`,
    })
  } catch (err) {
    console.error("[api/upload/POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
