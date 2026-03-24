export interface Promotion {
  id: string
  active: boolean
  order: number
  image: string
  title: string
  subtitle?: string
  badge?: string
  expiry?: string
  link?: string
  ctaLine?: string
  ctaPhone?: string
  ctaFacebook?: string
}
