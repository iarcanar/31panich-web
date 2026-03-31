import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { v2 as cloudinary } from "cloudinary"
import { writeFile } from "@/lib/blob-store"

const MAX_WIDTH = 800
const COUPON_SIZE = 400
const QUALITY = 80

// Configure Cloudinary from env
cloudinary.config({
  secure: true,
  // Reads CLOUDINARY_URL env automatically: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
})

async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `31-PANICH/${folder}`,
        format: "webp",
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result!.secure_url)
      },
    )
    stream.end(buffer)
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "products"

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "No valid image file" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let processed: Buffer

    if (folder === "coupons") {
      const cropX = parseInt(formData.get("cropX") as string) || 0
      const cropY = parseInt(formData.get("cropY") as string) || 0
      const cropSize = parseInt(formData.get("cropSize") as string) || 0

      let pipeline = sharp(buffer)
      if (cropSize > 0) {
        pipeline = pipeline.extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      }
      processed = await pipeline
        .resize({ width: COUPON_SIZE, height: COUPON_SIZE, fit: "cover" })
        .webp({ quality: QUALITY })
        .toBuffer()
    } else {
      processed = await sharp(buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
    }

    // Upload to Cloudinary if configured, fallback to blob-store
    let url: string
    if (process.env.CLOUDINARY_URL) {
      url = await uploadToCloudinary(processed, folder)
    } else {
      const filename = `${crypto.randomUUID()}.webp`
      url = await writeFile(`${folder}/${filename}`, processed, "image/webp")
    }

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
      { status: 500 },
    )
  }
}
