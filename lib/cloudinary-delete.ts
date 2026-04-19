import { v2 as cloudinary } from "cloudinary"

const cloudinaryUrl = process.env.CLOUDINARY_URL || ""
const parsed = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
if (parsed) {
  cloudinary.config({
    cloud_name: parsed[3],
    api_key: parsed[1],
    api_secret: parsed[2],
    secure: true,
  })
}

export function publicIdFromUrl(url: string): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return null
  const m = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+?)\.[a-z0-9]+$/i)
  return m ? m[1] : null
}

export async function destroyCloudinaryAsset(
  url: string,
  resourceType: "image" | "video" = "image"
): Promise<boolean> {
  const publicId = publicIdFromUrl(url)
  if (!publicId) return false
  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    })
    return res.result === "ok" || res.result === "not found"
  } catch (err) {
    console.error("[cloudinary-delete] failed:", publicId, err)
    return false
  }
}
