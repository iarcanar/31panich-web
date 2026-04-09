"use client"

import Image from "next/image"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import AiEnrichButton from "@/components/admin/AiEnrichButton"
import {
  SectionHeader,
  FieldLabel,
  TextInput,
  Toggle,
  StepperInput,
  DescriptionTextarea,
  Barcode,
} from "@/components/admin/ui"
import { CATEGORIES, getCategoryLabel } from "@/lib/categories"
import { CATALOGS } from "@/lib/catalogs"
import type { Product } from "@/lib/products"
import { useAuth } from "../layout"


function dataQuality(p: Product): { label: string; color: string; bg: string; border: string } {
  if (!p.price || !p.stock) {
    return { label: "ไม่มีราคา", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/40" }
  }
  if (!p.description || p.description === p.name || p.description.length < 20) {
    return { label: "ไม่มีข้อมูลสินค้า", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40" }
  }
  return { label: "ข้อมูลครบ", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40" }
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  category: "steel-keys",
  images: [] as string[],
  stock: "0",
  isNew: true,
  isBestseller: false,
  isPinned: false,
  brand: "",
  sku: "",
  tags: [] as string[],
  catalogId: "",
  variants: [] as { label: string; price: string; discount: string; stock: string }[],
}

// ─── Main page ──────────────────────────────────────────

export default function AdminProductsPage() {
  const { user, isAdmin } = useAuth()
  const canDeleteProduct = isAdmin || user?.role === "manager"
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [descFlash, setDescFlash] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadInfo, setUploadInfo] = useState("")
  const [formSnapshot, setFormSnapshot] = useState("")
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const scrollPosRef = useRef(0)
  const [filterCat, setFilterCat] = useState("all")
  const [catFilterOpen, setCatFilterOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "updated">("updated")
  const [filterFlag, setFilterFlag] = useState<"all" | "isNew" | "isBestseller" | "isPinned">("all")
  const [filterQuality, setFilterQuality] = useState<"all" | "incomplete" | "complete">("all")
  const [perPage, setPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [discountInput, setDiscountInput] = useState("")
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [editingStockValue, setEditingStockValue] = useState("")
  const [copiedSku, setCopiedSku] = useState<string | null>(null)
  const [showBarcode, setShowBarcode] = useState(false)
  const focusFieldRef = useRef<string | null>(null)

  // ─── Dirty tracking: ปุ่มจางเมื่อไม่มีการเปลี่ยนแปลง
  const formDirty = useMemo(() => {
    if (!formSnapshot) return true
    return JSON.stringify({ ...form, discountInput }) !== formSnapshot
  }, [form, discountInput, formSnapshot])

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products")
    setProducts(await res.json())
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // ─── Bulk import/export ─────────────────────────────────
  function handleExportJSON() {
    const json = JSON.stringify(products, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `products-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data)) {
        alert("ไฟล์ต้องเป็น JSON array ของสินค้า")
        return
      }
      if (!confirm(`นำเข้า ${data.length} สินค้า? (จะแทนที่ข้อมูลเดิมทั้งหมด)`)) return
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        alert(`นำเข้าสำเร็จ ${result.count} สินค้า (1 Blob operation)`)
        fetchProducts()
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`)
      }
    } catch (err) {
      alert(`ไฟล์ JSON ไม่ถูกต้อง: ${err}`)
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ""
    }
  }

  // ─── DEV: auto-open product edit from ?edit=<id> URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get("edit")
    if (!editId || products.length === 0) return
    const p = products.find((x) => x.id === editId)
    if (p) {
      handleEdit(p)
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [products])

  // ─── Reset to page 1 when filters/search/sort change
  useEffect(() => { setCurrentPage(1) }, [filterCat, filterFlag, filterQuality, searchQuery, sortBy, perPage])

  // ─── Focus on field when form opens via status label click
  useEffect(() => {
    if (showForm && focusFieldRef.current) {
      const field = focusFieldRef.current
      focusFieldRef.current = null
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${field}"]`) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.focus()
        }
      }, 300)
    }
  }, [showForm])

  const MAX_IMAGES = 5

  // ─── Image upload (รองรับหลายไฟล์พร้อมกัน, จำกัด 5 ภาพ)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const slots = MAX_IMAGES - form.images.length
    if (slots <= 0) return
    const batch = files.slice(0, slots)

    setUploading(true)
    setUploadInfo("")
    const results: string[] = []
    let lastInfo = ""

    for (const file of batch) {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) {
        results.push(data.url)
        lastInfo = `${data.originalSize} → ${data.optimizedSize} (ลด ${data.saved})`
      }
    }

    setUploading(false)
    if (results.length > 0) {
      setForm((f) => ({ ...f, images: [...f.images, ...results] }))
      setUploadInfo(results.length > 1 ? `อัพโหลด ${results.length} ภาพสำเร็จ` : lastInfo)
    }
    e.target.value = ""
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const imgs = [...f.images]
      const target = idx + dir
      if (target < 0 || target >= imgs.length) return f
      ;[imgs[idx], imgs[target]] = [imgs[target], imgs[idx]]
      return { ...f, images: imgs }
    })
  }

  // ─── Save (mode: "close" = กลับ list, "preview" = เปิดหน้าสินค้าใน tab ใหม่)
  async function handleSave(mode: "close" | "preview" | "stay" = "close"): Promise<{ id: string } | null> {
    // Validation: must have name AND (price OR at least one valid variant)
    const hasValidVariants = form.variants.some(
      (v) => v.label.trim() && Number(v.price) > 0,
    )
    if (!form.name) {
      if (mode !== "stay") alert("กรุณากรอกชื่อสินค้า")
      return null
    }
    if (!form.price && !hasValidVariants) {
      if (mode !== "stay") alert("กรุณากรอกราคา หรือเพิ่มตัวเลือก (variant) ที่มีราคา")
      return null
    }
    setSaving(true)
    const cleanVariants = form.variants
      .filter((v) => v.label.trim())
      .map((v) => {
        const fullPrice = Number(v.price) || 0
        let sellingPrice = fullPrice
        let originalPrice: number | null = null
        const disc = v.discount.trim()
        if (disc && fullPrice > 0) {
          if (disc.endsWith("%")) {
            const pct = parseFloat(disc)
            if (pct > 0 && pct < 100) { sellingPrice = Math.floor(fullPrice * (1 - pct / 100)); originalPrice = fullPrice }
          } else {
            const amt = parseFloat(disc)
            if (amt > 0 && amt < fullPrice) { sellingPrice = fullPrice - amt; originalPrice = fullPrice }
          }
        }
        return { label: v.label.trim(), price: sellingPrice, originalPrice, stock: Number(v.stock) || 0 }
      })
    const hasVariants = cleanVariants.length > 0

    // Auto-regenerate SEO tags ทุกครั้งที่บันทึก (รวม tags เดิม + สร้างจากข้อมูลใหม่)
    const tags = buildTags(form)

    const body = {
      ...form,
      image: form.images[0] || "",
      images: form.images,
      tags,
      // ถ้ามี variants → คำนวณ price/stock อัตโนมัติ, ไม่ใช้ originalPrice
      price: hasVariants
        ? Math.min(...cleanVariants.map((v) => v.price))
        : Number(form.price),
      originalPrice: hasVariants
        ? (() => {
            const discounted = cleanVariants.filter((v) => v.originalPrice && v.originalPrice > v.price)
            if (discounted.length === 0) return null
            const maxPct = Math.max(...discounted.map((v) => Math.round((1 - v.price / v.originalPrice!) * 100)))
            const minPrice = Math.min(...cleanVariants.map((v) => v.price))
            return Math.ceil(minPrice / (1 - maxPct / 100))
          })()
        : (form.originalPrice ? Number(form.originalPrice) : null),
      stock: hasVariants
        ? cleanVariants.reduce((sum, v) => sum + v.stock, 0)
        : Number(form.stock),
      variants: cleanVariants,
    }
    const res = editingId
      ? await fetch(`/api/products/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) {
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่")
      return null
    }
    const saved = await res.json()
    if (mode === "preview") {
      fetchProducts()
      setFormSnapshot(JSON.stringify({ ...form, discountInput }))
      window.open(`/products/${saved.category}/${encodeURIComponent(saved.slug)}`, "_blank")
    } else if (mode === "stay") {
      // Save without closing — used by AI enrich flow on a new draft
      // so the form transitions to "edit existing product" mode and the
      // returned id can immediately be used to call /api/ai/enrich.
      if (!editingId) setEditingId(saved.id)
      setFormSnapshot(JSON.stringify({ ...form, discountInput }))
      fetchProducts()
    } else {
      fetchProducts()
      closeForm()
    }
    return { id: saved.id }
  }

  // ─── Edit
  function handleEdit(p: Product) {
    scrollPosRef.current = window.scrollY
    const imgs = p.images?.length ? p.images : p.image ? [p.image] : []
    setForm({
      name: p.name, description: p.description, price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      category: p.category, images: imgs, stock: String(p.stock),
      isNew: p.isNew, isBestseller: p.isBestseller, isPinned: p.isPinned ?? false, brand: p.brand, sku: p.sku,
      tags: p.tags || [],
      catalogId: p.catalogId || "",
      variants: (p.variants || []).map((v) => {
        const fullPrice = v.originalPrice && v.originalPrice > v.price ? v.originalPrice : v.price
        let discount = ""
        if (v.originalPrice && v.originalPrice > v.price) {
          discount = `${Math.round((1 - v.price / v.originalPrice) * 100)}%`
        }
        return { label: v.label, price: String(fullPrice), discount, stock: String(v.stock ?? 0) }
      }),
    })
    setEditingId(p.id)
    setShowForm(true)
    setUploadInfo("")
    const disc = (p.originalPrice && p.price && p.originalPrice > p.price)
      ? `${Math.round((1 - p.price / p.originalPrice) * 100)}%` : ""
    setDiscountInput(disc)
    // snapshot สำหรับ dirty tracking
    setFormSnapshot(JSON.stringify({ ...{
      name: p.name, description: p.description, price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      category: p.category, images: imgs, stock: String(p.stock),
      isNew: p.isNew, isBestseller: p.isBestseller, isPinned: p.isPinned ?? false, brand: p.brand, sku: p.sku,
      tags: p.tags || [], catalogId: p.catalogId || "",
      variants: (p.variants || []).map((v) => {
        const fullPrice = v.originalPrice && v.originalPrice > v.price ? v.originalPrice : v.price
        let vDisc = ""
        if (v.originalPrice && v.originalPrice > v.price) vDisc = `${Math.round((1 - v.price / v.originalPrice) * 100)}%`
        return { label: v.label, price: String(fullPrice), discount: vDisc, stock: String(v.stock ?? 0) }
      }),
    }, discountInput: disc }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeForm() {
    const targetId = editingId
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setUploadInfo("")
    setDiscountInput("")
    if (targetId) {
      // Navigate to the page containing the edited product and scroll to it
      const targetPage = pageForProduct(targetId)
      setCurrentPage(targetPage)
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.querySelector(`[data-product-id="${targetId}"]`) as HTMLElement | null
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          } else {
            window.scrollTo({ top: scrollPosRef.current, behavior: "smooth" })
          }
        }, 50)
      })
    } else {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosRef.current, behavior: "smooth" })
      })
    }
  }

  // ─── Delete
  async function handleDelete(id: string) {
    if (!confirm("ลบสินค้านี้?")) return
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
    if (!res.ok) { alert("ลบไม่สำเร็จ"); return }
    fetchProducts()
  }

  // ─── Inline stock update
  async function handleStockSave(id: string) {
    const val = Math.max(0, parseInt(editingStockValue) || 0)
    await fetch(`/api/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stock: val }) })
    setEditingStockId(null)
    fetchProducts()
  }

  // ─── Edit with focus on specific field
  function handleEditWithFocus(p: Product, field: string) {
    focusFieldRef.current = field
    handleEdit(p)
  }

  // ─── Auto-generate SEO tags — v2: improved filtering + local SEO
  function buildTags(f: typeof form): string[] {
    const t = new Set<string>()

    // คำที่ไม่ใช่ keyword — skip ทั้ง Thai + English
    const SKIP = new Set([
      "รุ่น", "แบบ", "ตัว", "ชิ้น", "อัน", "ชุด", "ขนาด", "สำหรับ", "ประเภท",
      "สเปค", "จุดเด่น", "แบรนด์", "คุณสมบัติ", "รายละเอียด", "นิ้ว", "มม.",
      "เครื่อง", "พร้อม", "อย่าง", "ทั้งหมด", "ทั่วไป", "ต่างๆ", "หลากหลาย",
      "คุณภาพ", "คุณภาพสูง", "ทนทาน", "สะดวก", "สะดวกสบาย", "ง่ายดาย",
      "มืออาชีพ", "ประสิทธิภาพ", "ประสิทธิภาพสูง", "อเนกประสงค์",
      "ออกแบบ", "ออกแบบมา", "เหมาะสำหรับ", "เหมาะสำหรับงาน",
      "รับประกัน", "ประหยัด", "ยาวนาน", "เมื่อยล้า",
      "มอเตอร์", "วัตต์", "ทรงพลัง", "ตัด", "ขัดผิว", "ขั้ว", "รอบ", "นาที",
      "DIY", "E27", "มาพร้อม", "ใช้งาน", "กำลัง", "กำลังสูง",
      "แรงดัน", "แรงดันไฟ", "แรงดันไฟฟ้า", "ความเร็ว", "ความเร็วรอบ",
      "อายุการใช้งาน", "รายละเอียดสินค้า", "อุปกรณ์",
      "type", "set", "for", "and", "with", "the", "pro", "max", "mini",
    ])

    // คำเชื่อม / function words — skip เสมอ
    const FUNC = /^(เป็น|ใน|ที่|ของ|ให้|ได้|มี|จาก|กับ|ไม่|แล้ว|เพื่อ|โดย|อย่าง|และ|หรือ|คือ|แต่|ทั้ง|เช่น|จะ|การ|ความ|ช่วย|อีก|ก็|ถ้า|เมื่อ|ยัง|แค่|ทุก|บาง|อัน|ครั้ง|ยิ่ง|ด้วย|ต่อ|ไว้|แบบ|ตาม|เพียง)$/

    // ตัวเลขล้วน, spec numbers, สั้นเกิน → skip
    const isNoise = (w: string) =>
      /^\d+$/.test(w) ||                              // ตัวเลขล้วน: "220", "450"
      /^\d+[A-Za-z~\/]+/.test(w) ||                   // spec: "240V~50", "50/60Hz"
      /^#\d+/.test(w) ||                              // #120, #2
      /^[A-Za-z\d]{1,2}$/.test(w) ||                  // สั้นเกิน: "DC", "6A", "PD", "HI", "2T"
      /^x\d/.test(w) ||                               // x6 etc.
      /^\d+[A-Z]$/.test(w) ||                         // "24R"
      w.startsWith("และ") ||                          // "และอิฐ", "และสะดวกสบาย"
      w.startsWith("หรือ") ||                          // "หรือ..."
      w.startsWith("เหมาะ") ||                        // "เหมาะสำหรับ..."
      w.startsWith("ใช้งาน") ||                       // "ใช้งานง่าย", "ใช้งานสะดวก"
      w.startsWith("พร้อม") ||                        // "พร้อมใช้งาน..."
      w.startsWith("มาพร้อม") ||                      // "มาพร้อมมอเตอร์..."
      w.startsWith("สะดวก") ||                        // "สะดวกต่อการใช้งาน"
      w.startsWith("ประหยัด") ||                      // "ประหยัดไฟ..."
      w.includes("ได้ทันที") || w.includes("มากกว่า") ||
      w.includes("ประสิทธิภาพ") || w.includes("ฟังก์ชัน") ||
      w.includes("BULB") || w.includes("มอเตอร์") || w.includes("วัตต์") ||
      w.length > 20                                    // ยาวเกิน → ไม่ใช่ keyword

    // ชื่อเต็ม
    if (f.name) t.add(f.name)
    // แบรนด์
    if (f.brand) t.add(f.brand)
    // SKU/รุ่น — ไม่ซ้ำกับแบรนด์ และ SKU ไม่ขึ้นต้นด้วยแบรนด์
    const skuIsBrand = !f.sku || f.sku === f.brand || f.sku.startsWith(f.brand)
    if (f.sku && !skuIsBrand) t.add(f.sku)
    if (f.brand && f.sku && !skuIsBrand) t.add(`${f.brand} ${f.sku}`)
    // Model number จากชื่อ (ถ้า SKU ไม่ใช่ model จริง)
    const modelMatch = f.name.match(/[A-Z]{1,5}[\-]?[A-Z0-9]{3,}[A-Z0-9\-]*/i)
    if (modelMatch && modelMatch[0] !== f.brand && modelMatch[0] !== f.sku) t.add(modelMatch[0])

    // หมวดหมู่
    const cat = CATEGORIES.find((c) => c.value === f.category)?.label
    if (cat) t.add(cat)

    // คำจากชื่อสินค้า (ข้าม noise)
    const nameTokens = f.name
      .split(/[\s\-\/\(\)\"\"\[\]【】]+/)
      .map((w) => w.replace(/[,.'"""]+$/g, ""))
      .filter((w) => w.length >= 2 && !SKIP.has(w.toLowerCase()) && !FUNC.test(w) && !isNoise(w))
    nameTokens.forEach((w) => t.add(w))

    // ประเภทสินค้า + แบรนด์ (e.g. "สว่าน EMTOP", "เครื่องเจียร Makita")
    if (f.brand) {
      const typeName = nameTokens.find((w) => /[\u0E00-\u0E7F]/.test(w) && w.length >= 3)
      if (typeName && typeName !== f.brand) {
        t.add(`${typeName} ${f.brand}`)
        t.add(`${typeName} ลพบุรี`)           // ← local SEO: "สว่าน ลพบุรี"
      }
    }

    // คำจาก description — เฉพาะ keyword ที่คนค้นหาจริง (ไม่เอา filler)
    const isSearchable = (w: string) =>
      (/[\u0E00-\u0E7F]/.test(w) && w.length >= 4) ||                       // Thai word >= 4 chars
      (/^[A-Z][A-Za-z0-9\-]+$/.test(w) && w.length >= 3) ||                 // Brand/model
      (w.length >= 3 && /[\u0E00-\u0E7F]/.test(w) && /[A-Za-z]/.test(w))    // Mixed
    if (f.description) {
      const descWords = f.description
        .split(/[\s\-\/\(\)\"\"\[\]【】✦•\n:,，.。;]+/)
        .map((w) => w.replace(/[,.'"""✦•]+$/g, ""))
        .filter((w) =>
          w.length >= 3 && w.length <= 15 &&
          !SKIP.has(w.toLowerCase()) && !SKIP.has(w) && !FUNC.test(w) &&
          !isNoise(w) && !t.has(w) && isSearchable(w)
        )
      // จำกัดแค่ 4 คำจาก description — เอาเฉพาะ keyword จริงๆ
      descWords.slice(0, 4).forEach((w) => t.add(w))
    }

    // Default SEO tags — ลพบุรี + ร้าน
    t.add("ลพบุรี")
    t.add("สามหนึ่งพานิช")
    t.add("ร้านสามหนึ่ง")
    return Array.from(t).filter((s) => s.trim().length > 0).slice(0, 20)
  }

  function handleAutoTags() {
    setForm((f) => ({ ...f, tags: buildTags(f) }))
  }

  const catLabel = getCategoryLabel

  // Precompute category counts once (avoid O(N*M) on every render)
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of products) map[p.category] = (map[p.category] || 0) + 1
    return map
  }, [products])

  const filtered = useMemo(() => {
    let list = filterCat === "all" ? [...products] : products.filter((p) => p.category === filterCat)

    // Flag filter — สินค้าใหม่ / ขายดี / ปักหมุด
    if (filterFlag !== "all") {
      list = list.filter((p) => p[filterFlag])
    }

    // Quality filter — ข้อมูลครบ / ไม่ครบ
    if (filterQuality === "incomplete") {
      list = list.filter((p) => dataQuality(p).label !== "ข้อมูลครบ")
    } else if (filterQuality === "complete") {
      list = list.filter((p) => dataQuality(p).label === "ข้อมูลครบ")
    }

    // Search — split query into tokens and match all of them (order-independent)
    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().replace(/\s+/g, " ").trim().split(" ")
      list = list.filter((p) => {
        const hay = `${p.name} ${p.brand} ${p.sku} ${p.description}`.toLowerCase()
        return tokens.every((t) => hay.includes(t))
      })
    }

    // Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price)
    } else {
      // default: updated — ล่าสุดก่อน
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }

    return list
  }, [products, filterCat, filterFlag, filterQuality, searchQuery, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedList = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  // Find which page a product is on (for scroll restoration)
  function pageForProduct(id: string) {
    const idx = filtered.findIndex((p) => p.id === id)
    return idx === -1 ? 1 : Math.floor(idx / perPage) + 1
  }

  // Shared pagination bar — rendered above and below the product list
  function paginationBar(pos: "top" | "bottom") {
    if (filtered.length === 0 || totalPages <= 1) return null
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 px-1 ${pos === "top" ? "mb-4" : "mt-4"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#64748b]">แสดง</span>
          {([20, 50, 100] as const).map((n) => (
            <button
              key={n}
              onClick={() => { setPerPage(n); setCurrentPage(1) }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                perPage === n
                  ? "bg-white/10 text-white border-white/20"
                  : "text-[#64748b] border-transparent hover:text-[#94a3b8]"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="text-[10px] text-[#64748b]">
            ({(safePage - 1) * perPage + 1}-{Math.min(safePage * perPage, filtered.length)} จาก {filtered.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="หน้าแรก"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => { setCurrentPage(safePage - 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="หน้าก่อน"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((pg) => pg === 1 || pg === totalPages || Math.abs(pg - safePage) <= 1)
            .reduce<(number | "...")[]>((acc, pg, i, arr) => {
              if (i > 0 && pg - (arr[i - 1]) > 1) acc.push("...")
              acc.push(pg)
              return acc
            }, [])
            .map((pg, i) =>
              pg === "..." ? (
                <span key={`${pos}-dot-${i}`} className="px-1 text-[#64748b] text-xs">...</span>
              ) : (
                <button
                  key={`${pos}-${pg}`}
                  onClick={() => { setCurrentPage(pg); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                  className={`min-w-[28px] h-7 rounded-lg text-[11px] font-medium transition-colors ${
                    safePage === pg
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      : "text-[#64748b] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {pg}
                </button>
              )
            )}
          <button
            onClick={() => { setCurrentPage(safePage + 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="หน้าถัดไป"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="หน้าสุดท้าย"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      {/* ─── Header bar ─── */}
      <header className="bg-[#14141f] border-b border-[#2a2a3a]">
        <div className="max-w-6xl mx-auto px-3 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.webp" alt="31" width={24} height={24} className="w-6 h-6 rounded object-contain" />
            <span className="text-[11px] text-[#64748b]">{products.length} สินค้า</span>
          </div>
          {!showForm && (
            <button
              onClick={() => { scrollPosRef.current = window.scrollY; setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); setUploadInfo(""); setDiscountInput(""); setFormSnapshot("") }}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
              </svg>
              เพิ่มสินค้า
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ═══════════════ FORM ═══════════════ */}
        {showForm && (
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl mb-6 overflow-hidden">
            {/* Form header */}
            <div className="px-5 py-3.5 border-b border-[#2a2a3a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeForm}
                  className="flex items-center gap-1 text-[#64748b] hover:text-[#f1f5f9] text-xs transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  กลับ
                </button>
                <div className="w-px h-4 bg-[#2a2a3a]" />
                <h2 className="text-sm font-bold">{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (formDirty) { handleSave("preview") }
                    else if (editingId) { const p = products.find((x) => x.id === editingId); if (p) window.open(`/products/${p.category}/${encodeURIComponent(p.slug)}`, "_blank") }
                  }}
                  disabled={saving || (formDirty && (!form.name || (form.variants.length === 0 ? !form.price : !form.variants.some((v) => v.label.trim() && v.price))))}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150 disabled:cursor-not-allowed ${formDirty ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#94a3b8]/50"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {formDirty ? "อัปเดตและดูผล" : "ดูรายละเอียด"}
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={saving || !formDirty || !form.name || (form.variants.length === 0 ? !form.price : !form.variants.some((v) => v.label.trim() && v.price))}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors duration-150 disabled:cursor-not-allowed ${formDirty ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-[#2a2a3a] text-[#64748b]"}`}
                >
                  {saving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังบันทึก
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {editingId ? "อัปเดต" : "บันทึก"}
                    </>
                  )}
                </button>
                <button
                  onClick={closeForm}
                  className="p-1 text-[#64748b] hover:text-[#f1f5f9] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* ─── Left: Image upload (multi) ─── */}
              <div className="lg:w-[320px] p-5 lg:border-r border-b lg:border-b-0 border-[#2a2a3a]">
                <SectionHeader>ภาพสินค้า ({form.images.length})</SectionHeader>

                {/* Main preview — ภาพแรก = ภาพหลัก */}
                {form.images.length > 0 ? (
                  <div className="border border-dashed border-[#2a2a3a] rounded-xl overflow-hidden bg-[#0a0a0f] mb-3">
                    <Image src={form.images[0]} alt="main" width={400} height={400} className="w-full aspect-square object-contain p-3" />
                  </div>
                ) : (
                  <div className="border border-dashed border-[#2a2a3a] rounded-xl overflow-hidden bg-[#0a0a0f] mb-3">
                    <div className="aspect-square flex flex-col items-center justify-center gap-2 text-[#64748b]">
                      <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <p className="text-xs">ยังไม่มีภาพ</p>
                    </div>
                  </div>
                )}

                {/* Thumbnails grid — ทุกภาพ พร้อมปุ่มจัดการ */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {form.images.map((img, i) => (
                      <div key={`${img}-${i}`} className="relative group/thumb">
                        <Image src={img} alt={`img-${i}`} width={100} height={100} className={`w-full aspect-square object-cover rounded-lg border-2 transition-colors ${i === 0 ? "border-cyan-400" : "border-[#2a2a3a]"}`} />
                        {/* Delete button — มุมบนขวา */}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded text-white shadow opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-600"
                          title="ลบภาพ"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* Move buttons — ล่างกลาง */}
                        {form.images.length > 1 && (
                          <div className="absolute bottom-1 inset-x-0 flex justify-center gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(i, -1)}
                                className="p-0.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded text-[#94a3b8] hover:text-white transition-colors"
                                title="เลื่อนซ้าย"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            )}
                            {i < form.images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(i, 1)}
                                className="p-0.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded text-[#94a3b8] hover:text-white transition-colors"
                                title="เลื่อนขวา"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload buttons */}
                {form.images.length < MAX_IMAGES ? (
                  <div className="flex gap-2">
                    {/* Camera button — mobile */}
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] text-xs cursor-pointer transition-colors hover:bg-[#2a2a3a] hover:text-[#f1f5f9] active:bg-[#2a2a3a]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      ถ่ายภาพ
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {/* Browse button */}
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] text-xs cursor-pointer transition-colors hover:bg-[#2a2a3a] hover:text-[#f1f5f9] active:bg-[#2a2a3a]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      เลือกภาพ
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-400">ครบ {MAX_IMAGES} ภาพแล้ว</p>
                )}
                {uploading && (
                  <p className="text-amber-400 text-xs mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    กำลังย่อขนาด...
                  </p>
                )}
                {uploadInfo && (
                  <p className="text-emerald-400 text-[11px] mt-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {uploadInfo}
                  </p>
                )}
                <p className="text-[10px] text-[#64748b] mt-1.5">ภาพแรก = ภาพหลัก | สูงสุด {MAX_IMAGES}</p>
              </div>

              {/* ─── Right: Form fields ─── */}
              <div className="flex-1 p-5 space-y-5">
                {/* Section: ข้อมูลหลัก */}
                <div>
                  <SectionHeader>ข้อมูลสินค้า</SectionHeader>
                  <div className="space-y-3">
                    <div>
                      <FieldLabel required>ชื่อสินค้า</FieldLabel>
                      <TextInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="เช่น สว่านไฟฟ้า Makita HP1630" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>แบรนด์</FieldLabel>
                        <TextInput value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} placeholder="เช่น Makita" />
                      </div>
                      <div>
                        <FieldLabel>SKU</FieldLabel>
                        <TextInput value={form.sku} onChange={(v) => setForm((f) => ({ ...f, sku: v }))} placeholder="รหัสสินค้า" mono />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>หมวดหมู่</FieldLabel>
                        <div className="relative">
                          <select
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                            className="w-full px-3 py-2 pr-8 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm appearance-none cursor-pointer transition-colors duration-150 focus:border-[#94a3b8] outline-none"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>แคตตาล็อก</FieldLabel>
                        <div className="relative">
                          <select
                            value={form.catalogId}
                            onChange={(e) => setForm((f) => ({ ...f, catalogId: e.target.value }))}
                            className="w-full px-3 py-2 pr-8 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm appearance-none cursor-pointer transition-colors duration-150 focus:border-[#94a3b8] outline-none"
                          >
                            <option value="">ไม่มี</option>
                            {CATALOGS.map((c) => (
                              <option key={c.id} value={c.id}>{c.brand}</option>
                            ))}
                          </select>
                          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ราคา & สต็อก — เฉพาะเมื่อไม่มีตัวเลือก */}
                {form.variants.length === 0 && (
                  <>
                    <div className="border-t border-[#2a2a3a]" />
                    <div>
                      <SectionHeader>ราคา & สต็อก</SectionHeader>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <FieldLabel required>ราคาขาย (฿)</FieldLabel>
                          <TextInput type="number" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} placeholder="0" mono dataField="price" />
                        </div>
                        <div>
                          <FieldLabel>ลดราคา</FieldLabel>
                          <TextInput
                            value={discountInput}
                            onChange={(v) => {
                              setDiscountInput(v)
                              const price = Number(form.price)
                              if (!price || !v.trim()) {
                                setForm((f) => ({ ...f, originalPrice: "" }))
                                return
                              }
                              if (v.trim().endsWith("%")) {
                                const pct = parseFloat(v)
                                if (pct > 0 && pct < 100) {
                                  setForm((f) => ({ ...f, originalPrice: String(Math.ceil(price / (1 - pct / 100))) }))
                                }
                              } else {
                                const amt = parseFloat(v)
                                if (amt > 0) {
                                  setForm((f) => ({ ...f, originalPrice: String(price + amt) }))
                                }
                              }
                            }}
                            placeholder="100 หรือ 20%"
                            mono
                          />
                        </div>
                        <StepperInput label="สต็อก (ชิ้น)" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} />
                      </div>
                      {form.originalPrice && Number(form.originalPrice) > Number(form.price) && (() => {
                        const orig = Number(form.originalPrice)
                        const sell = Number(form.price)
                        const pct = Math.round((1 - sell / orig) * 100)
                        return (
                          <div className="mt-2 flex items-center gap-3 text-[11px]">
                            <span className="text-gray-500 line-through">฿{orig.toLocaleString()}</span>
                            <span className="text-white font-semibold">฿{sell.toLocaleString()}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pct >= 20 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                              -{pct}%
                            </span>
                            <span className="text-emerald-400">ประหยัด ฿{(orig - sell).toLocaleString()}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="border-t border-[#2a2a3a]" />

                {/* Section: ตัวเลือกสินค้า (Variants) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">ตัวเลือกสินค้า</h3>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { label: "", price: "", discount: "", stock: "0" }] }))}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                      </svg>
                      เพิ่มตัวเลือก
                    </button>
                  </div>
                  {form.variants.length === 0 ? (
                    <p className="text-[10px] text-[#64748b]">ไม่มีตัวเลือก — แสดงราคาเดียว</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Header — desktop only */}
                      <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#64748b] uppercase tracking-wider">
                        <span className="flex-1">ชื่อตัวเลือก</span>
                        <span className="w-28 text-center">ราคาเต็ม</span>
                        <span className="w-24 text-center">ลดราคา</span>
                        <span className="w-20 text-center">สต็อก</span>
                        <span className="w-6" />
                      </div>
                      {form.variants.map((v, i) => {
                        const vFull = Number(v.price)
                        const vDisc = v.discount.trim()
                        let vSelling: number | null = null
                        let vPct = 0
                        if (vFull > 0 && vDisc) {
                          if (vDisc.endsWith("%")) {
                            const pct = parseFloat(vDisc)
                            if (pct > 0 && pct < 100) { vSelling = Math.floor(vFull * (1 - pct / 100)); vPct = Math.round(pct) }
                          } else {
                            const amt = parseFloat(vDisc)
                            if (amt > 0 && amt < vFull) { vSelling = vFull - amt; vPct = Math.round((amt / vFull) * 100) }
                          }
                        }
                        return (
                        <div key={i} className="border border-[#2a2a3a] rounded-lg p-2.5 sm:border-0 sm:p-0">
                          {/* Desktop: single row */}
                          <div className="hidden sm:flex items-center gap-2">
                          <input
                            value={v.label}
                            onChange={(e) => {
                              const variants = [...form.variants]
                              variants[i] = { ...variants[i], label: e.target.value }
                              setForm((f) => ({ ...f, variants }))
                            }}
                            placeholder="เช่น 7W, 1โหล"
                            className="flex-1 px-3 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none"
                          />
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b] text-xs">฿</span>
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], price: e.target.value }
                                setForm((f) => ({ ...f, variants }))
                              }}
                              placeholder="0"
                              className="w-28 pl-7 pr-3 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm font-mono transition-colors duration-150 focus:border-[#94a3b8] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <input
                            value={v.discount}
                            onChange={(e) => {
                              const variants = [...form.variants]
                              variants[i] = { ...variants[i], discount: e.target.value }
                              setForm((f) => ({ ...f, variants }))
                            }}
                            placeholder="100 / 20%"
                            className="w-24 px-2 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm font-mono text-center transition-colors duration-150 focus:border-[#94a3b8] outline-none"
                          />
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const variants = [...form.variants]
                              variants[i] = { ...variants[i], stock: e.target.value }
                              setForm((f) => ({ ...f, variants }))
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm font-mono text-center transition-colors duration-150 focus:border-[#94a3b8] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}
                            className="p-1 text-[#64748b] hover:text-red-400 transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          </div>
                          {/* Mobile: stacked fields */}
                          <div className="sm:hidden space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={v.label}
                                onChange={(e) => {
                                  const variants = [...form.variants]
                                  variants[i] = { ...variants[i], label: e.target.value }
                                  setForm((f) => ({ ...f, variants }))
                                }}
                                placeholder="ชื่อ เช่น 7W, 1โหล"
                                className="flex-1 px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm outline-none focus:border-[#94a3b8]"
                              />
                              <button
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}
                                className="p-1.5 text-[#64748b] hover:text-red-400 transition-colors shrink-0"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] text-[#64748b] mb-1">ราคา ฿</p>
                                <input
                                  type="number"
                                  value={v.price}
                                  onChange={(e) => {
                                    const variants = [...form.variants]
                                    variants[i] = { ...variants[i], price: e.target.value }
                                    setForm((f) => ({ ...f, variants }))
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm font-mono outline-none focus:border-[#94a3b8] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-[#64748b] mb-1">ลดราคา</p>
                                <input
                                  value={v.discount}
                                  onChange={(e) => {
                                    const variants = [...form.variants]
                                    variants[i] = { ...variants[i], discount: e.target.value }
                                    setForm((f) => ({ ...f, variants }))
                                  }}
                                  placeholder="20%"
                                  className="w-full px-2 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-sm font-mono outline-none focus:border-[#94a3b8]"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-[#64748b] mb-1">สต็อก</p>
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const variants = [...form.variants]
                                    variants[i] = { ...variants[i], stock: e.target.value }
                                    setForm((f) => ({ ...f, variants }))
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm font-mono outline-none focus:border-[#94a3b8] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                          </div>
                          {vPct > 0 && vSelling !== null && (
                            <div className="flex items-center gap-2 ml-0 mt-0.5 mb-1 text-[11px]">
                              <span className="text-gray-500 line-through">฿{vFull.toLocaleString()}</span>
                              <span className="text-white">→</span>
                              <span className="text-emerald-400 font-semibold">ขาย ฿{vSelling.toLocaleString()}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${vPct >= 20 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>-{vPct}%</span>
                              <span className="text-gray-500">ประหยัด ฿{(vFull - vSelling).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-[#64748b] mt-1.5">เช่น &quot;7W = ฿65&quot;, &quot;12W = ฿75&quot; หรือ &quot;1โหล = ฿450&quot; | ลดราคา: &quot;100&quot; หรือ &quot;20%&quot;</p>
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2a3a]" />

                {/* Section: รายละเอียด */}
                <div>
                  <SectionHeader>รายละเอียด</SectionHeader>
                  <DescriptionTextarea
                    value={form.description}
                    onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                    flash={descFlash}
                  />
                  <AiEnrichButton
                    productId={editingId}
                    currentDescription={form.description}
                    onDescriptionChange={(desc) => setForm((f) => ({ ...f, description: desc }))}
                    onFlash={() => {
                      setDescFlash(true)
                      setTimeout(() => setDescFlash(false), 1500)
                    }}
                    onRequestSave={async () => {
                      // Save the draft without closing the form, then return
                      // the new product id so AiEnrichButton can call /api/ai/enrich
                      const saved = await handleSave("stay")
                      return saved?.id ?? null
                    }}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2a3a]" />

                {/* Section: SEO Tags */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">SEO TAGS</h3>
                    <button
                      type="button"
                      onClick={handleAutoTags}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      สร้างอัตโนมัติ
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {form.tags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-full text-xs text-[#c8d0da]">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}
                            className="text-[#64748b] hover:text-red-400 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const tag = tagInput.trim()
                        if (tag && !form.tags.includes(tag)) {
                          setForm((f) => ({ ...f, tags: [...f.tags, tag] }))
                        }
                        setTagInput("")
                      }
                    }}
                    placeholder="พิมพ์แท็กเอง แล้วกด Enter"
                    className="w-full px-3 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-xs transition-colors duration-150 focus:border-[#94a3b8] outline-none"
                  />
                  <p className="text-[10px] text-[#64748b] mt-1.5">ใช้สำหรับ SEO + AI search — กด &quot;สร้างอัตโนมัติ&quot; หรือเพิ่มเอง</p>
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2a3a]" />

                {/* Section: สถานะ */}
                <div>
                  <SectionHeader>สถานะการแสดงผล</SectionHeader>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <Toggle checked={form.isNew} onChange={(v) => setForm((f) => ({ ...f, isNew: v, ...(v && f.isPinned && f.isBestseller ? { isBestseller: false } : {}) }))} label="สินค้าใหม่" color="emerald" />
                    <Toggle checked={form.isBestseller} onChange={(v) => setForm((f) => ({ ...f, isBestseller: v, ...(v && f.isPinned && f.isNew ? { isNew: false } : {}) }))} label="สินค้าขายดี" color="amber" />
                    <Toggle checked={form.isPinned} onChange={(v) => setForm((f) => ({ ...f, isPinned: v, ...(v && f.isNew && f.isBestseller ? { isBestseller: false } : {}) }))} label="ปักหมุดสินค้า" color="cyan" />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Form actions ─── */}
            <div className="px-5 py-3.5 border-t border-[#2a2a3a] flex items-center justify-between bg-[#0a0a0f]/50">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
              >
                ยกเลิก
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (formDirty) { handleSave("preview") }
                    else if (editingId) { const p = products.find((x) => x.id === editingId); if (p) window.open(`/products/${p.category}/${encodeURIComponent(p.slug)}`, "_blank") }
                  }}
                  disabled={saving || (formDirty && (!form.name || (form.variants.length === 0 ? !form.price : !form.variants.some((v) => v.label.trim() && v.price))))}
                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 disabled:cursor-not-allowed ${formDirty ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-[#1e1e2e] border border-[#2a2a3a] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#94a3b8]/50"}`}
                  title={formDirty ? "บันทึกและเปิดหน้าสินค้าใน tab ใหม่" : "เปิดหน้าสินค้าใน tab ใหม่"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {formDirty ? "อัปเดตและดูผล" : "ดูรายละเอียด"}
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={saving || !formDirty || !form.name || (form.variants.length === 0 ? !form.price : !form.variants.some((v) => v.label.trim() && v.price))}
                  className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-colors duration-150 disabled:cursor-not-allowed ${formDirty ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-[#2a2a3a] text-[#64748b]"}`}
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังบันทึก
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {editingId ? "อัปเดต" : "บันทึก"}
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ FILTER — Desktop pills (8 per row) ═══════════════ */}
        <div className="hidden md:grid grid-cols-8 gap-1 mb-5">
          <button
            onClick={() => setFilterCat("all")}
            className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors duration-150 ${
              filterCat === "all"
                ? "bg-white/15 text-white border-white/20"
                : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8 hover:text-[#94a3b8]"
            }`}
          >
            ทั้งหมด {products.length}
          </button>
          {CATEGORIES.map((c) => {
            const count = catCounts[c.value] || 0
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors duration-150 ${
                  filterCat === c.value
                    ? "bg-white/15 text-white border-white/20"
                    : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8 hover:text-[#94a3b8]"
                }`}
              >
                <Image src={`/category-icons/${c.value}.svg`} alt="" width={12} height={12} className="w-3 h-3 opacity-70" />
                {c.label} {count}
              </button>
            )
          })}
        </div>

        {/* ═══════════════ FILTER — Mobile collapsible ═══════════════ */}
        <div className="md:hidden mb-3 relative">
          <button
            onClick={() => setCatFilterOpen(!catFilterOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#14141f] border border-[#2a2a3a] rounded-lg text-sm transition-colors"
          >
            <div className="flex items-center gap-2">
              {filterCat !== "all" && (
                <Image src={`/category-icons/${filterCat}.svg`} alt="" width={14} height={14} className="w-3.5 h-3.5 opacity-70" />
              )}
              <span className="text-white text-xs font-medium">
                {filterCat === "all" ? "ทั้งหมด" : catLabel(filterCat)}
              </span>
              <span className="text-[#64748b] text-[10px]">
                {filterCat === "all" ? products.length : catCounts[filterCat] || 0}
              </span>
            </div>
            <svg className={`w-3.5 h-3.5 text-[#64748b] transition-transform duration-200 ${catFilterOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {catFilterOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[#14141f] border border-[#2a2a3a] rounded-xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => { setFilterCat("all"); setCatFilterOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors ${
                  filterCat === "all" ? "bg-white/10 text-white" : "text-[#94a3b8] active:bg-white/5"
                }`}
              >
                <span>ทั้งหมด</span>
                <span className="text-[10px] text-[#64748b]">{products.length}</span>
              </button>
              {CATEGORIES.map((c) => {
                const count = catCounts[c.value] || 0
                return (
                  <button
                    key={c.value}
                    onClick={() => { setFilterCat(c.value); setCatFilterOpen(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs border-t border-[#2a2a3a]/50 transition-colors ${
                      filterCat === c.value ? "bg-white/10 text-white" : "text-[#94a3b8] active:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Image src={`/category-icons/${c.value}.svg`} alt="" width={14} height={14} className="w-3.5 h-3.5 opacity-60" />
                      {c.label}
                    </span>
                    <span className="text-[10px] text-[#64748b]">{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══════════════ SEARCH + SORT/FILTER (2 lines on mobile) ═══════════════ */}
        <div className="mb-4 space-y-2">
          {/* Line 1: Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า ชื่อ SKU แบรนด์..."
              className="w-full bg-[#14141f] border border-[#2a2a3a] rounded-lg text-xs text-[#f1f5f9] placeholder-[#64748b] pl-8 pr-8 py-2 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Line 2: Quality filter + Sort + Flag filters — all combinable */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Quality filter (toggle) */}
            {([
              ["incomplete", "ไม่ครบ"],
              ["complete", "ครบแล้ว"],
            ] as const).map(([val, label]) => {
              const active = filterQuality === val
              const count = products.filter((p) => {
                const inCat = filterCat === "all" || p.category === filterCat
                if (!inCat) return false
                return val === "incomplete" ? dataQuality(p).label !== "ข้อมูลครบ" : dataQuality(p).label === "ข้อมูลครบ"
              }).length
              return (
                <button
                  key={val}
                  onClick={() => setFilterQuality((prev) => prev === val ? "all" : val)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors whitespace-nowrap ${
                    active
                      ? val === "incomplete" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8"
                  }`}
                >
                  {label} {count}
                </button>
              )
            })}

            <div className="w-px h-3.5 bg-white/10" />

            {/* Sort */}
            <button
              onClick={() => setSortBy("updated")}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors whitespace-nowrap ${
                sortBy === "updated"
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                  : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8"
              }`}
            >
              ล่าสุด
            </button>
            <button
              onClick={() => setSortBy(sortBy === "price-desc" ? "price-asc" : "price-desc")}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors whitespace-nowrap ${
                sortBy === "price-desc" || sortBy === "price-asc"
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                  : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8"
              }`}
            >
              ราคา {sortBy === "price-asc" ? "↑" : "↓"}
            </button>

            <div className="w-px h-3.5 bg-white/10" />

            {/* Flag filters */}
            {([
              ["isNew", "ใหม่", "emerald"],
              ["isBestseller", "ขายดี", "amber"],
              ["isPinned", "ปักหมุด", "cyan"],
            ] as const).map(([val, label, color]) => {
              const count = products.filter((p) => (filterCat === "all" || p.category === filterCat) && p[val]).length
              const active = filterFlag === val
              const colorMap = {
                emerald: active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8",
                amber: active ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8",
                cyan: active ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8",
              }
              return (
                <button
                  key={val}
                  onClick={() => setFilterFlag(filterFlag === val ? "all" : val)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors whitespace-nowrap ${colorMap[color]}`}
                >
                  {label} {count}
                </button>
              )
            })}

            <div className="w-px h-3.5 bg-white/10 hidden lg:block" />

            <button
              onClick={() => setShowBarcode(!showBarcode)}
              className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors whitespace-nowrap ${
                showBarcode
                  ? "bg-white/10 text-[#f1f5f9] border-white/20"
                  : "bg-white/5 text-[#64748b] border-transparent hover:bg-white/8"
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-.75a1.125 1.125 0 01-1.125-1.125V4.875zm5.25 0c0-.621.504-1.125 1.125-1.125h.375c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125H10.125A1.125 1.125 0 019 19.125V4.875zm4.5 0c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-.75a1.125 1.125 0 01-1.125-1.125V4.875zm5.25 0c0-.621.504-1.125 1.125-1.125h.375c.621 0 1.125.504 1.125 1.125v14.25c0 .621-.504 1.125-1.125 1.125h-.375a1.125 1.125 0 01-1.125-1.125V4.875z" />
              </svg>
              Barcode
            </button>

            <span className="text-[10px] text-[#64748b] ml-auto">{filtered.length} รายการ</span>
          </div>
        </div>

        {/* ═══════════════ PAGINATION (top) ═══════════════ */}
        {paginationBar("top")}

        {/* ═══════════════ PRODUCT LIST ═══════════════ */}
        {filtered.length === 0 ? (
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl p-16 text-center">
            <svg className="w-12 h-12 mx-auto text-[#2a2a3a] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-[#64748b] text-sm">ยังไม่มีสินค้า</p>
            <p className="text-[#2a2a3a] text-xs mt-1">กด &quot;+ เพิ่มสินค้า&quot; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <>
            {/* ── Mobile compact list ── */}
            <div className="md:hidden bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2a2a3a] text-[10px] text-[#64748b] uppercase tracking-wider">
                สินค้า
              </div>
              {paginatedList.map((p) => (
                <button
                  key={p.id}
                  data-product-id={p.id}
                  onClick={() => handleEdit(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-[#2a2a3a]/50 active:bg-white/5 transition-colors text-left"
                >
                  {p.image ? (
                    <Image src={p.image} alt={p.name} width={40} height={40} className="w-10 h-10 object-cover rounded-lg border border-[#2a2a3a] shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-[#1e1e2e] rounded-lg border border-[#2a2a3a] flex items-center justify-center text-[#2a2a3a] shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f1f5f9] text-sm font-medium truncate">{p.name}</p>
                    {/* ⚠ COMPACT card view — there is a TWIN render in the table view below
                        (search for "p.brand || p.sku" — should match 2 places).
                        Always update both when changing how brand/sku is displayed.
                        Edge case: brand can be empty string while sku exists. */}
                    {(p.brand || p.sku) && (
                      <p className="text-[#64748b] text-[11px] truncate">
                        {p.brand && p.sku ? `${p.brand} | ${p.sku}` : p.brand || p.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 font-semibold text-sm font-mono">฿{p.price.toLocaleString()}</p>
                    <p className={`text-[10px] font-mono ${p.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.stock > 0 ? `${p.stock} ชิ้น` : "หมด"}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-[#2a2a3a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block bg-[#14141f] border border-[#2a2a3a] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a3a]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">สินค้า</th>
                    {showBarcode && <th className="text-center px-2 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">Barcode</th>}
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">หมวด</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">ราคา</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">สต็อก</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-medium text-[#64748b] uppercase tracking-wider">สถานะ</th>
                    {canDeleteProduct && <th className="w-20 px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((p) => (
                    <tr key={p.id} data-product-id={p.id} className="border-b border-[#2a2a3a]/50 hover:bg-white/[0.02] transition-colors duration-100 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} width={44} height={44} className="w-11 h-11 object-cover rounded-lg border border-[#2a2a3a] shrink-0" />
                          ) : (
                            <div className="w-11 h-11 bg-[#1e1e2e] rounded-lg border border-[#2a2a3a] flex items-center justify-center text-[#2a2a3a] text-xs shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <button onClick={() => handleEdit(p)} className="text-[#f1f5f9] font-medium text-sm truncate hover:text-cyan-400 transition-colors text-left">{p.name}</button>
                            {/* ⚠ TABLE view — there is a TWIN render in the compact card view above
                                (search for "p.brand || p.sku" — should match 2 places).
                                Always update both when changing how brand/sku is displayed.
                                Edge case: brand can be empty string while sku exists.
                                History: previously {p.brand && ...} hid SKU when brand empty (fixed in 1.3.2). */}
                            {(p.brand || p.sku) && (
                              <p className="text-[#64748b] text-[11px] flex items-center gap-0">
                                {p.brand}
                                {p.brand && p.sku && <span className="ml-1 text-[#2a2a3a]">|</span>}
                                {p.sku && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.sku); setCopiedSku(p.id); setTimeout(() => setCopiedSku(null), 1500) }}
                                    className={`${p.brand ? "ml-1" : ""} font-mono hover:text-cyan-400 transition-colors cursor-copy`}
                                    title="คลิกเพื่อคัดลอก SKU"
                                  >
                                    {p.sku}
                                  </button>
                                )}
                                {copiedSku === p.id && <span className="ml-1.5 text-[10px] text-emerald-400 animate-pulse">copied!</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {showBarcode && (
                        <td className="px-2 py-0 text-center">
                          <Barcode value={p.sku} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-[#94a3b8] text-xs">{catLabel(p.category)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-amber-400 font-semibold font-mono">฿{p.price.toLocaleString()}</span>
                        {p.originalPrice && (
                          <span className="text-[#64748b] line-through text-[11px] ml-1.5 font-mono">฿{p.originalPrice.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingStockId === p.id ? (
                          <input
                            type="number"
                            autoFocus
                            value={editingStockValue}
                            onChange={(e) => setEditingStockValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleStockSave(p.id)
                              if (e.key === "Escape") setEditingStockId(null)
                            }}
                            onBlur={() => handleStockSave(p.id)}
                            className="w-16 px-2 py-1 bg-[#1e1e2e] border border-cyan-500/50 rounded text-center text-xs font-mono text-[#f1f5f9] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingStockId(p.id); setEditingStockValue(String(p.stock)) }}
                            className={`text-xs font-mono px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${p.stock > 0 ? "text-emerald-400" : "text-red-400"}`}
                            title="คลิกเพื่อแก้ไขสต็อก"
                          >
                            {p.stock > 0 ? p.stock : "หมด"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const q = dataQuality(p)
                          if (q.label === "ข้อมูลครบ") {
                            return (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${q.bg} ${q.border} ${q.color} whitespace-nowrap`}>
                                {q.label}
                              </span>
                            )
                          }
                          const targetField = q.label === "ไม่มีราคา" ? "price" : "description"
                          return (
                            <button
                              onClick={() => handleEditWithFocus(p, targetField)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border ${q.bg} ${q.border} ${q.color} whitespace-nowrap hover:brightness-125 transition-all cursor-pointer`}
                              title="คลิกเพื่อแก้ไข"
                            >
                              {q.label}
                            </button>
                          )
                        })()}
                      </td>
                      {canDeleteProduct && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-[#94a3b8] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="ลบ"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════ PAGINATION (bottom) ═══════════════ */}
            {paginationBar("bottom")}

          </>
        )}
      </div>
    </div>
  )
}
