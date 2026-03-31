import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({ secure: true })

/** Generate a signed upload params for client-side direct upload to Cloudinary */
export async function POST(req: NextRequest) {
  try {
    const { folder, transformation } = await req.json()

    const timestamp = Math.round(Date.now() / 1000)
    const params: Record<string, string | number> = {
      timestamp,
      folder: `31-PANICH/${folder || "products"}`,
      format: "webp",
      quality: "auto:good",
    }

    if (transformation) {
      params.transformation = transformation
    }

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_URL?.match(/:([^@]+)@/)?.[1] || "",
    )

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: "docoo51xb",
      apiKey: "223724812552767",
      folder: params.folder,
      format: "webp",
      quality: "auto:good",
      transformation: params.transformation || "",
    })
  } catch (err) {
    console.error("[api/upload/sign]", err)
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 })
  }
}
