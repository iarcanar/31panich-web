/** Single source of truth for product catalogs — shared by admin, frontend & product detail */
export const CATALOGS = [
  {
    id: "osuka",
    brand: "Osuka",
    description: "แคตตาล็อกเครื่องมือช่าง Osuka รวมเครื่องมือและอุปกรณ์ช่างคุณภาพครบทุกประเภท",
    url: "https://anyflip.com/qjteo/lhvk/",
    image: "/catalog/osuka.webp",
  },
  {
    id: "emtop",
    brand: "Emtop",
    description: "เครื่องมือและอุปกรณ์คุณภาพสูง สำหรับช่างมืออาชีพและผู้ใช้ทั่วไป",
    url: "https://www.emtopthailand.com/products",
    image: "/catalog/emtop.webp",
  },
  {
    id: "dongcheng",
    brand: "Dong Cheng (DC)",
    description: "แคตตาล็อกผลิตภัณฑ์ประจำปี 2025 รวบรวมสินค้าคุณภาพหลากหลายชนิด",
    url: "/catalog/dc-2025.pdf",
    image: "/catalog/dongcheng.webp",
  },
  {
    id: "ingco",
    brand: "iNGCO",
    description: "เครื่องมือและอุปกรณ์ช่างคุณภาพ เหมาะสำหรับงานก่อสร้างและซ่อมแซม",
    url: "/catalog/ingco-2025.pdf",
    image: "/catalog/ingco.webp",
  },
  {
    id: "beger",
    brand: "Beger",
    description: "แคตตาล็อกสีทาบ้านเบเยอร์ รวมเฉดสีครบทุกกลุ่ม สำหรับงานทาภายในและภายนอก",
    url: "/catalog/beger-2026.pdf",
    image: "/catalog/beger.webp",
  },
  {
    id: "atm-spray",
    brand: "ATM Spray",
    description: "แคตตาล็อกสีสเปรย์ ATM รวมเฉดสีและผลิตภัณฑ์สเปรย์ครบทุกประเภท",
    url: "/catalog/atm-spray-2026.pdf",
    image: "/catalog/atm-spray.webp",
  },
] as const

export type CatalogId = (typeof CATALOGS)[number]["id"]

export function getCatalogById(id: string) {
  return CATALOGS.find((c) => c.id === id) ?? null
}
