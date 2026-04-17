export interface Reel {
  id: string
  active: boolean
  order: number
  title: string
  poster: string            // Cloudinary URL — portrait thumbnail (9:16)
  previewMp4?: string       // optional: short muted loop preview MP4 (autoplay on active card)
  facebookUrl: string       // original FB Reel URL
  createdAt: string
  updatedAt: string
}
