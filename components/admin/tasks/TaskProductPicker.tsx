"use client"

import { useEffect, useRef, useState } from "react"
import type { TaskProductRef } from "@/types/task"
import { cldThumb, fmtBaht } from "./status"
import { TextInput } from "@/components/admin/ui"

interface SearchResult {
  id: string
  name: string
  sku: string
  image: string
  price: number
  category: string
}

export function TaskProductPicker({
  value,
  onChange,
  searchPlaceholder = "พิมพ์ชื่อ หรือรหัสสินค้า",
  notePlaceholder = "เช่น ใช้ 150 แต้ม / ราคาชุด 1,290",
}: {
  value: TaskProductRef[]
  onChange: (v: TaskProductRef[]) => void
  /** คำใบ้ที่เปลี่ยนตามประเภทงาน — ส่งมาจาก TYPE_META เพื่อให้ภาษาตรงกับสิ่งที่กำลังทำ */
  searchPlaceholder?: string
  notePlaceholder?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Debounce 300ms + cancel in-flight request on every keystroke/unmount
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      abortRef.current?.abort()
      setResults([])
      setSearching(false)
      setSearched(false)
      return
    }
    setSearching(true)
    setSearched(false)
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      fetch(`/api/admin/product-search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setResults(Array.isArray(data) ? data : [])
          setSearched(true)
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            setResults([])
            setSearched(true)
          }
        })
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => () => abortRef.current?.abort(), [])

  function addProduct(p: SearchResult) {
    if (value.some((v) => v.productId === p.id)) {
      setQuery("")
      return
    }
    onChange([...value, { productId: p.id, name: p.name, sku: p.sku, image: p.image, price: p.price }])
    setQuery("")
    setResults([])
    setSearched(false)
  }

  function addCustom() {
    const name = query.trim()
    if (!name) return
    onChange([...value, { productId: null, name, sku: "", image: "", price: 0 }])
    setQuery("")
    setResults([])
    setSearched(false)
  }

  function updateRef(idx: number, patch: Partial<TaskProductRef>) {
    onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }

  function removeRef(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  const isBundle = value.length >= 2
  const total = value.reduce((sum, v) => sum + (Number(v.price) || 0), 0)

  return (
    <div className="space-y-2">
      <TextInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />

      {query.trim().length >= 2 && (
        <div className="space-y-1">
          {searching && <div className="text-[11px] text-[#64748b] px-1">กำลังค้นหา...</div>}

          {!searching && results.length > 0 && (
            <div className="space-y-1">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center gap-2 min-h-[44px] px-2 bg-[#1a1a28] border border-white/10 rounded-lg hover:border-amber-500/40 transition-colors cursor-pointer text-left"
                >
                  <ProductThumb image={p.image} name={p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-[#64748b] truncate">
                      {p.sku} · {fmtBaht(p.price)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="px-1 py-2">
              <p className="text-[11px] text-[#64748b] mb-2">ไม่เจอในระบบ</p>
              {/* echo คำที่พิมพ์กลับไป ให้เห็นชัดว่าไม่ได้พิมพ์ทิ้ง — และปุ่มนี้เป็น secondary
                  เพราะทั้งฟอร์มสงวนปุ่มทึบสีส้มไว้ให้ "ส่งใบงาน" ปุ่มเดียว */}
              <button
                type="button"
                onClick={addCustom}
                className="h-9 px-3 max-w-full rounded-lg bg-teal-500/10 border border-teal-500/25 hover:bg-teal-500/20 text-teal-300 text-xs font-medium transition-colors cursor-pointer truncate"
              >
                + ใช้ชื่อ &quot;{query.trim()}&quot; เลย
              </button>
            </div>
          )}
        </div>
      )}

      {value.length > 0 &&
        (isBundle ? (
          <div className="bg-[#1a1a28] border border-violet-500/25 border-l-2 border-l-violet-500/60 rounded-lg p-2.5 space-y-2">
            <span className="bg-violet-500/15 text-violet-300 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap inline-block">
              ขายเป็นชุด · {value.length} ชิ้น
            </span>
            {value.map((p, i) => (
              <div key={i}>
                {i > 0 && (
                  <div className="flex justify-center py-0.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center">
                      ＋
                    </span>
                  </div>
                )}
                <ProductRefCard p={p} notePlaceholder={notePlaceholder} onUpdate={(patch) => updateRef(i, patch)} onRemove={() => removeRef(i)} />
              </div>
            ))}
            <div className="text-[11px] text-[#94a3b8] pt-1 border-t border-white/5">ปกติ {fmtBaht(total)}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {value.map((p, i) => (
              <ProductRefCard key={i} p={p} notePlaceholder={notePlaceholder} onUpdate={(patch) => updateRef(i, patch)} onRemove={() => removeRef(i)} />
            ))}
          </div>
        ))}
    </div>
  )
}

function ProductThumb({ image, name }: { image: string; name: string }) {
  const [broken, setBroken] = useState(false)
  if (!image || broken) {
    return <div className="w-10 h-10 rounded bg-[#2a2a3a] shrink-0" />
  }
  return (
    <img
      src={cldThumb(image, 96)}
      alt={name}
      className="w-10 h-10 rounded object-cover shrink-0 bg-[#2a2a3a]"
      onError={() => setBroken(true)}
    />
  )
}

function ProductRefCard({
  p,
  notePlaceholder,
  onUpdate,
  onRemove,
}: {
  p: TaskProductRef
  notePlaceholder: string
  onUpdate: (patch: Partial<TaskProductRef>) => void
  onRemove: () => void
}) {
  const isCustom = p.productId === null
  // ช่องราคาเป็น controlled จาก props ตรงๆ ไม่เก็บ state ในตัวเอง — เพราะ list ใช้ index
  // เป็น key พอลบสินค้าที่ไม่ใช่ตัวสุดท้าย React จะ reuse component เดิม ทำให้ราคาที่
  // ค้างใน state ภายในไปโผล่ผิดใบ (โชว์ราคาผิดให้พนักงานเห็น)
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 flex gap-2">
      <ProductThumb image={p.image} name={p.name} />
      <div className="flex-1 min-w-0 space-y-1.5">
        {isCustom ? (
          <>
            <TextInput value={p.name} onChange={(v) => onUpdate({ name: v })} placeholder="ชื่อสินค้า" />
            <TextInput
              type="number"
              value={p.price ? String(p.price) : ""}
              onChange={(v) => onUpdate({ price: Number(v) || 0 })}
              placeholder="ราคา"
            />
          </>
        ) : (
          <>
            <div className="text-sm text-white truncate">{p.name}</div>
            <div className="text-[11px] text-[#64748b] truncate">
              {p.sku} · {fmtBaht(p.price)}
            </div>
          </>
        )}
        <TextInput
          value={p.note || ""}
          onChange={(v) => onUpdate({ note: v })}
          placeholder={notePlaceholder}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#64748b] hover:text-red-300 transition-colors cursor-pointer flex items-center justify-center"
        aria-label="เอาออก"
      >
        ×
      </button>
    </div>
  )
}
