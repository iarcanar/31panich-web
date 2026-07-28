"use client"

import { useState } from "react"
import type { TaskItem, TaskType } from "@/types/task"
import { FieldLabel, TextInput } from "@/components/admin/ui"
import { TYPE_META } from "./status"
import { TaskProductPicker } from "./TaskProductPicker"
import { TaskAttachmentUploader } from "./TaskAttachmentUploader"

export function TaskItemEditor({
  item,
  index,
  type,
  onChange,
  onRemove,
}: {
  item: TaskItem
  index: number
  /** ประเภทของใบงาน — ใช้เลือกคำใบ้/ตัวอย่างให้ตรงงาน (อ่านจาก TYPE_META จุดเดียว) */
  type: TaskType
  onChange: (i: TaskItem) => void
  onRemove: () => void
}) {
  const { hint: typeHint, itemPlaceholder } = TYPE_META[type]
  // New/empty items start expanded (so the seeded first item on task-create
  // opens straight away); items that already carry content start collapsed.
  const [expanded, setExpanded] = useState(
    () => !item.title.trim() && !item.detail.trim() && item.products.length === 0 && item.attachments.length === 0
  )

  const productCount = item.products.length
  const attachmentCount = item.attachments.length
  const hasBadge = productCount > 0 || attachmentCount > 0

  function handleRemove() {
    if (item.attachments.length > 0) {
      if (!confirm(`ลบรายการนี้?\nรูปที่แนบไว้ (${item.attachments.length} รูป) จะหายไปด้วย`)) return
    }
    onRemove()
  }

  return (
    <div className="bg-[#1a1a28] border border-white/10 rounded-lg overflow-hidden">
      {typeHint && <div className="px-3 pt-2 text-[11px] text-[#64748b]">{typeHint}</div>}

      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="w-full flex items-center gap-2 min-h-[44px] px-3 py-2 cursor-pointer select-none"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-white whitespace-nowrap">รายการ {index + 1}</span>
          {item.title.trim() && <span className="text-sm text-[#94a3b8] truncate">{item.title}</span>}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {hasBadge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#94a3b8] whitespace-nowrap">
              {productCount > 0 && `${productCount} สินค้า`}
              {productCount > 0 && attachmentCount > 0 && " · "}
              {attachmentCount > 0 && `${attachmentCount} รูป`}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#64748b] hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="ลบรายการ"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>

          <svg
            className={`w-4 h-4 text-[#64748b] transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          <div>
            <FieldLabel>ชื่อรายการ</FieldLabel>
            <TextInput
              value={item.title}
              onChange={(v) => onChange({ ...item, title: v })}
              placeholder={itemPlaceholder}
            />
          </div>

          <div>
            <FieldLabel>รายละเอียด</FieldLabel>
            <textarea
              value={item.detail}
              onChange={(e) => onChange({ ...item, detail: e.target.value })}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base md:text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none resize-y"
            />
          </div>

          <div>
            <FieldLabel>สินค้า</FieldLabel>
            <TaskProductPicker value={item.products} onChange={(v) => onChange({ ...item, products: v })} />
          </div>

          <TaskAttachmentUploader value={item.attachments} onChange={(v) => onChange({ ...item, attachments: v })} />
        </div>
      )}
    </div>
  )
}
