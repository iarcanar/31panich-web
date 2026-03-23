/** Single source of truth for product categories — shared by server & client */
export const CATEGORIES = [
  { value: "steel-keys", label: "เหล็ก-กุญแจ" },
  { value: "plumbing", label: "ประปา" },
  { value: "glue", label: "กาว" },
  { value: "tape", label: "เทปกาว" },
  { value: "pump", label: "ปั๊มน้ำ" },
  { value: "paint", label: "สีทาบ้าน" },
  { value: "spray-paint", label: "สีสเปรย์" },
  { value: "industrial-paint", label: "สีอุตสาหกรรม" },
  { value: "oil", label: "น้ำมัน-สารหล่อลื่น" },
  { value: "electrical", label: "ไฟฟ้า" },
  { value: "supplies", label: "วัสดุ-อุปกรณ์" },
  { value: "tools", label: "เครื่องมือช่าง" },
  { value: "screws", label: "นอต-ตะปูเกลียว" },
  { value: "nets", label: "ตาข่าย-กรองแสง" },
  { value: "general", label: "เบ็ดเตล็ด" },
] as const

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}
