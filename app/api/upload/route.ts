import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

export const maxDuration = 30

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Configure Cloudinary from env (reads CLOUDINARY_URL automatically)
cloudinary.config({ secure: true })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "products"

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "No valid image file" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalKB = Math.round(buffer.length / 1024)

    // Build Cloudinary transformation
    const isCoupon = folder === "coupons"
    const cropX = parseInt(formData.get("cropX") as string) || 0
    const cropY = parseInt(formData.get("cropY") as string) || 0
    const cropSize = parseInt(formData.get("cropSize") as string) || 0

    const transformation: Record<string, unknown>[] = []

    if (isCoupon && cropSize > 0) {
      // 1:1 crop at position then resize to 400x400
      transformation.push(
        { width: cropSize, height: cropSize, x: cropX, y: cropY, crop: "crop" },
        { width: 400, height: 400, crop: "fill" },
      )
    } else if (isCoupon) {
      transformation.push({ width: 400, height: 400, crop: "fill" })
    } else {
      // Products: max 800px wide
      transformation.push({ width: 800, crop: "limit" })
    }

    // Upload to Cloudinary with server-side transformation
    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `31-PANICH/${folder}`,
          format: "webp",
          quality: "auto:good",
          resource_type: "image",
          transformation,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result!.secure_url)
        },
      )
      stream.end(buffer)
    })

    const optimizedKB = "auto"

    return NextResponse.json({
      url,
      originalSize: `${originalKB} KB`,
      optimizedSize: optimizedKB,
      saved: "Cloudinary auto",
    })
  } catch (err) {
    console.error("[api/upload/POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}
