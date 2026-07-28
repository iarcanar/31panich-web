"use client"

import { useState } from "react"
import type { TaskItem, TaskType } from "@/types/task"
import { TextInput } from "@/components/admin/ui"
import { TYPE_META } from "./status"
import { TaskProductPicker } from "./TaskProductPicker"
import { TaskAttachmentUploader } from "./TaskAttachmentUploader"

export function TaskItemEditor({
  item,
  index,
  type,
  taskCode,
  taskTitle,
  onChange,
  onRemove,
}: {
  item: TaskItem
  index: number
  /** ประเภทของใบงาน — ใช้เลือกคำใบ้/ตัวอย่างให้ตรงงาน (อ่านจาก TYPE_META จุดเดียว) */
  type: TaskType
  /** ใช้ตั้งชื่อไฟล์ตอนโหลดต้นฉบับ (ดู TaskAttachmentUploader nameContext) */
  taskCode: string
  taskTitle: string
  onChange: (i: TaskItem) => void
  onRemove: () => void
}) {
  const { cardWord, titlePlaceholder, searchPlaceholder, notePlaceholder } = TYPE_META[type]
  // general = บรีฟอิสระคือเนื้อหาหลัก → โชว์ชื่อ+รายละเอียดตรงๆ เสมอ
  // points_reward/bundle_promo = สินค้าคือเนื้อหาหลัก → รายละเอียดยุบไว้ กดค่อยกาง
  const isFreeform = type === "general"
  const [showDetail, setShowDetail] = useState(() => !isFreeform && item.detail.trim() !== "")

  function handleRemove() {
    if (item.attachments.length > 0) {
      if (!confirm(`ลบการ์ดนี้?\nรูปที่แนบไว้ (${item.attachments.length} รูป) จะหายไปด้วย`)) return
    }
    onRemove()
  }

  const nameContext = { taskCode, taskTitle, itemIndex: index }

  return (
    <div className="bg-[#1a1a28] border border-white/10 border-l-2 border-l-teal-400/60 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="bg-teal-500/15 text-teal-300 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
          {cardWord} {index + 1}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#64748b] hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="ลบการ์ด"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>

      {isFreeform && (
        <>
          <TextInput
            value={item.title}
            onChange={(v) => onChange({ ...item, title: v })}
            placeholder={titlePlaceholder}
          />
          <textarea
            value={item.detail}
            onChange={(e) => onChange({ ...item, detail: e.target.value })}
            rows={3}
            placeholder="รายละเอียดเพิ่มเติม..."
            className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base md:text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none resize-y"
          />
        </>
      )}

      <TaskProductPicker
        value={item.products}
        onChange={(v) => onChange({ ...item, products: v })}
        searchPlaceholder={searchPlaceholder}
        notePlaceholder={notePlaceholder}
      />

      <div>
        <p className="text-[11px] text-[#94a3b8] mb-1">รูปของการ์ดนี้</p>
        <TaskAttachmentUploader
          value={item.attachments}
          onChange={(v) => onChange({ ...item, attachments: v })}
          nameContext={nameContext}
        />
      </div>

      {!isFreeform &&
        (showDetail ? (
          <textarea
            value={item.detail}
            onChange={(e) => onChange({ ...item, detail: e.target.value })}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติม..."
            className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base md:text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none resize-y"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-xs text-teal-300 hover:text-teal-200 transition-colors cursor-pointer"
          >
            + รายละเอียดเพิ่มเติม (ถ้ามี)
          </button>
        ))}
    </div>
  )
}
