import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import path from "path"
import { writeFile, mkdir } from "fs/promises"

const UPLOAD_DIR = path.join(process.cwd(), "public", "products")
const MAX_WIDTH = 800
const QUALITY = 80

export async function POST(req: NextRequest) {
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

  // Save
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filename = `${crypto.randomUUID()}.webp`
  const filepath = path.join(UPLOAD_DIR, filename)
  await writeFile(filepath, processed)

  const originalKB = Math.round(buffer.length / 1024)
  const optimizedKB = Math.round(processed.length / 1024)

  return NextResponse.json({
    url: `/products/${filename}`,
    originalSize: `${originalKB} KB`,
    optimizedSize: `${optimizedKB} KB`,
    saved: `${Math.round((1 - processed.length / buffer.length) * 100)}%`,
  })
}
