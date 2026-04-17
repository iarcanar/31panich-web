import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({ secure: true })

/** Generate signed upload params for client-side direct upload to Cloudinary
 *  resourceType: "image" (default, signs format=webp) | "video" (no format forced — preserves mp4)
 */
export async function POST(req: NextRequest) {
  try {
    const { folder, transformation, resourceType = "image", eager } = await req.json()

    const timestamp = Math.round(Date.now() / 1000)

    const params: Record<string, string | number> = {
      timestamp,
      folder: `31-PANICH/${folder || "products"}`,
    }

    if (resourceType === "image") {
      params.format = "webp"
    }
    if (transformation) params.transformation = transformation
    if (eager) params.eager = eager

    const apiSecret = process.env.CLOUDINARY_URL?.match(/:([^:]+)@/)?.[1] || ""
    const signature = cloudinary.utils.api_sign_request(params, apiSecret)

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: "docoo51xb",
      apiKey: "223724812552767",
      resourceType,
      ...params,
    })
  } catch (err) {
    console.error("[api/upload/sign]", err)
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 })
  }
}
