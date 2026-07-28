"use client"

import { useState } from "react"
import type { Task, TaskItem, TaskProductRef, TaskStatus, TaskAttachment } from "@/types/task"
import {
  STATUS_META,
  STATUS_ORDER,
  PRIORITY_META,
  TYPE_META,
  cldThumb,
  relativeThai,
  fmtDueDate,
  isOverdue,
  fmtBaht,
} from "./status"
import { attachmentFilename, downloadOne, downloadAll } from "./download"

/** ข้อความบรีฟสำหรับวางใน Photoshop/LINE/โปรแกรมออกแบบ — ให้พี่ธีอ่านรู้เรื่องทันทีไม่ต้องเปิดระบบ */
function formatTaskBrief(task: Task): string {
  const metaParts = [TYPE_META[task.type].label]
  if (task.priority === "urgent") metaParts.push(PRIORITY_META.urgent.label)
  if (task.dueDate) metaParts.push(`ต้องการภายใน ${fmtDueDate(task.dueDate)}`)

  const lines = [`[${task.code}] ${task.title}`, `ประเภท: ${metaParts.join(" · ")}`, ""]

  task.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.title || `รายการ ${i + 1}`}`)
    item.products.forEach((p) => {
      // สินค้านอกระบบไม่มี SKU/ราคา — อย่าให้เหลือ "( ) ฿0" ค้างในบรีฟที่พี่ธีจะก๊อปไปใช้
      const parts = [p.name]
      if (p.sku.trim()) parts.push(`(${p.sku.trim()})`)
      if (p.price > 0) parts.push(fmtBaht(p.price))
      if (p.note && p.note.trim()) parts.push(`— ${p.note.trim()}`)
      lines.push(`   - ${parts.join(" ")}`)
    })
    if (item.detail.trim()) lines.push(`   หมายเหตุ: ${item.detail.trim()}`)
    if (item.attachments.length > 0) {
      lines.push(`   รูป ${item.attachments.length} ใบ`)
    }
  })

  return lines.join("\n")
}

export function TaskCard({
  task,
  canChangeStatus,
  onChanged,
  onEdit,
  onDelete,
}: {
  task: Task
  /** เฉพาะ admin (ทีมทำสื่อ) เท่านั้นที่เดินสถานะได้ — manager สั่งงาน/แก้ไข/ลบได้ตามเดิม */
  canChangeStatus: boolean
  onChanged: (t: Task) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [sendingComment, setSendingComment] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [taskDownload, setTaskDownload] = useState<{ done: number; total: number } | null>(null)
  const [briefCopied, setBriefCopied] = useState(false)

  const meta = STATUS_META[task.status]
  const overdue = isOverdue(task.dueDate, task.status)
  const isUrgent = task.priority === "urgent"
  const isDone = task.status === "done"

  const allAttachments = task.items.flatMap((it) => it.attachments)
  const thumbCount = allAttachments.length
  const itemsCount = task.items.length

  /** ไฟล์ทั้งหมดของใบงาน เรียงตามลำดับรายการ/รูปจริง — ใช้กับปุ่ม "โหลดรูปทั้งหมด" */
  const downloadableFiles = task.items.flatMap((item, itemIndex) =>
    item.attachments.map((attachment, imageIndex) => ({
      url: attachment.url,
      filename: attachmentFilename({ taskCode: task.code, taskTitle: task.title, itemIndex, imageIndex, attachment }),
    }))
  )

  async function handleDownloadAllImages() {
    if (taskDownload || downloadableFiles.length === 0) return
    setTaskDownload({ done: 0, total: downloadableFiles.length })
    await downloadAll(downloadableFiles, (done, total) => setTaskDownload({ done, total }))
    setTaskDownload(null)
  }

  async function handleCopyBrief() {
    const text = formatTaskBrief(task)
    try {
      if (!navigator.clipboard) throw new Error("no clipboard")
      await navigator.clipboard.writeText(text)
      setBriefCopied(true)
      setTimeout(() => setBriefCopied(false), 2000)
    } catch {
      alert("คัดลอกไม่สำเร็จ ลองเลือกข้อความในใบงานแล้วคัดลอกเอง")
    }
  }

  async function putStatus(next: TaskStatus) {
    setBusy(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      const updated: Task = await res.json()
      onChanged(updated)
    } catch {
      setSaveError("บันทึกไม่สำเร็จ ลองอีกครั้ง")
    } finally {
      setBusy(false)
    }
  }

  async function sendComment() {
    const text = commentText.trim()
    if (!text) return
    setSendingComment(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      const updated: Task = await res.json()
      onChanged(updated)
      setCommentText("")
    } catch {
      setSaveError("บันทึกไม่สำเร็จ ลองอีกครั้ง")
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div
      className={[
        "bg-[#13131d] border border-white/10 rounded-xl p-3",
        isUrgent ? "border-l-2 border-l-red-500" : "",
        isDone ? "opacity-60 border-dashed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full min-h-[44px] flex flex-col gap-1 text-left cursor-pointer"
      >
        {/* แถวบน: pill สถานะ + ด่วน + code + กำหนดส่ง */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className={`shrink-0 text-[13px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap ${meta.pill}`}>
            {meta.label}
          </span>
          {isUrgent && (
            <span className="shrink-0 text-[13px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap bg-red-500/10 text-red-400 border-red-500/30">
              {PRIORITY_META.urgent.label}
            </span>
          )}
          <span className="shrink-0 font-mono text-[14px] text-[#64748b] whitespace-nowrap">{task.code}</span>
          {task.dueDate && (
            <span className={`ml-auto shrink-0 whitespace-nowrap text-[14px] ${overdue ? "text-red-400 font-medium" : "text-[#64748b]"}`}>
              {overdue ? "เลยกำหนด" : `ต้องการภายใน ${fmtDueDate(task.dueDate)}`}
            </span>
          )}
        </div>

        {/* ชื่องาน */}
        <div className="text-[17px] font-medium text-white line-clamp-2">{task.title}</div>

        {/* ความคืบหน้า — เห็นตั้งแต่ยังไม่กางว่าใบนี้เดินไปถึงขั้นไหนแล้ว */}
        <StatusTrack status={task.status} className="mt-1 mb-0.5" />

        {/* thumbnail strip + นับ */}
        <div className="flex items-center gap-2 min-w-0">
          {thumbCount > 0 && (
            <div className="flex -space-x-2 shrink-0">
              {allAttachments.slice(0, 4).map((a, i) => (
                <img
                  key={i}
                  src={cldThumb(a.url, 96)}
                  alt=""
                  className="w-10 h-10 rounded object-cover bg-[#1e1e2e] border border-[#13131d]"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden"
                  }}
                />
              ))}
            </div>
          )}
          <span className="text-[14px] text-[#64748b] whitespace-nowrap truncate min-w-0">
            {itemsCount} รายการ{thumbCount > 0 ? ` · ${thumbCount} รูป` : ""}
          </span>
        </div>

        {/* meta จาง + ลูกศร */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] text-[#64748b] truncate min-w-0">
            โดย {task.createdBy.name} · {relativeThai(task.updatedAt)}
          </span>
          <svg
            className={`shrink-0 w-5 h-5 text-[#64748b] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-[15px] px-3 py-2 rounded-lg">{saveError}</div>
          )}

          {/* ตัวควบคุมสถานะ — ปุ่มเดินสถานะโชว์เฉพาะ admin
              ไม่ใช่ admin ก็ยังเห็นแถบความคืบหน้า แต่บอกเหตุผลไว้ว่าทำไมไม่มีปุ่ม
              (ห้าม disable เงียบๆ) */}
          <div>
            <StatusTrack status={task.status} />
            {canChangeStatus ? (
              <>
                {meta.next && meta.nextLabel && meta.nextBtn && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => putStatus(meta.next as TaskStatus)}
                    className={`mt-3 h-12 w-full rounded-lg text-[17px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${meta.nextBtn}`}
                  >
                    {meta.nextLabel}
                  </button>
                )}
                {meta.prev && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => putStatus(meta.prev as TaskStatus)}
                    className="mt-2 w-full text-center text-[14px] text-[#64748b] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ย้อนกลับเป็น &quot;{STATUS_META[meta.prev].label}&quot;
                  </button>
                )}
              </>
            ) : (
              <p className="mt-3 text-[14px] text-[#64748b] th-text">
                ความคืบหน้าปรับโดยทีมทำสื่อ (Admin) — สั่งงาน แก้ไข และคุยงานได้ตามปกติ
              </p>
            )}
          </div>

          {/* description */}
          {task.description && <p className="text-[15px] text-[#94a3b8] whitespace-pre-wrap">{task.description}</p>}

          {/* แถบเครื่องมือทีมทำสื่อ — teal สื่อว่าเป็นเครื่องมือ ไม่ใช่การกระทำเปลี่ยนข้อมูล */}
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-2 space-y-1.5">
            <div className="flex flex-col sm:flex-row gap-2">
              {thumbCount > 0 && (
                <button
                  type="button"
                  disabled={!!taskDownload}
                  onClick={handleDownloadAllImages}
                  className="w-full sm:w-auto h-10 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-300 text-[15px] font-medium transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {taskDownload
                    ? `กำลังโหลด ${taskDownload.done}/${taskDownload.total}...`
                    : `โหลดรูปทั้งหมด (${thumbCount} รูป)`}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyBrief}
                className="w-full sm:w-auto h-10 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-300 text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                {briefCopied ? "คัดลอกแล้ว ✓" : "คัดลอกบรีฟ"}
              </button>
            </div>
            {thumbCount > 0 && (
              <p className="text-[13px] text-[#64748b]">
                เบราว์เซอร์อาจถามอนุญาตดาวน์โหลดหลายไฟล์ — กดอนุญาตครั้งเดียว
              </p>
            )}
          </div>

          {/* รายการ (items) */}
          {task.items.length > 0 && (
            <div className="space-y-2">
              {task.items.map((item, i) => (
                <TaskItemRow
                  key={item.id}
                  item={item}
                  index={i}
                  taskCode={task.code}
                  taskTitle={task.title}
                  onImageClick={setLightboxUrl}
                />
              ))}
            </div>
          )}

          {/* คุยงาน */}
          <TaskComments
            task={task}
            commentText={commentText}
            setCommentText={setCommentText}
            sendComment={sendComment}
            sending={sendingComment}
          />

          {/* แถวปุ่มล่าง */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onEdit}
              className="h-10 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              แก้ไข
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="h-10 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              ลบ
            </button>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={cldThumb(lightboxUrl, 1400)} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  )
}

/** แถบความคืบหน้าอ่านอย่างเดียว — 3 ช่วงเท่ากัน เติมสีตามสถานะปัจจุบัน
 *  ขั้นที่ผ่านแล้วติด ✓ สีจาง · ขั้นปัจจุบันสีเข้ม+เรืองแสง · ขั้นที่ยังไม่ถึงเป็นสีเทา
 *  ใช้ทั้งตอนการ์ดย่อ (เห็นทันทีว่าถึงไหน) และตอนกาง */
function StatusTrack({ status, className = "" }: { status: TaskStatus; className?: string }) {
  const idx = STATUS_ORDER.indexOf(status)
  const meta = STATUS_META[status]
  return (
    <div className={`flex items-start gap-1.5 w-full ${className}`}>
      {STATUS_ORDER.map((s, i) => {
        const passed = i < idx
        const current = i === idx
        return (
          <div key={s} className="flex-1 min-w-0">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                current ? `${meta.bar} ${meta.glow}` : passed ? meta.barSoft : "bg-[#2a2a3a]"
              }`}
            />
            <div
              className={`mt-1 text-[13px] leading-tight truncate ${
                current ? `${meta.text} font-semibold` : passed ? "text-[#64748b]" : "text-[#475569]"
              }`}
            >
              {passed ? "✓ " : ""}
              {STATUS_META[s].label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 1 รายการในใบงาน — ย่อ/กางได้อีกชั้น */
function TaskItemRow({
  item,
  index,
  taskCode,
  taskTitle,
  onImageClick,
}: {
  item: TaskItem
  index: number
  taskCode: string
  taskTitle: string
  onImageClick: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [itemDownloading, setItemDownloading] = useState(false)
  const [downloadingIdx, setDownloadingIdx] = useState<Set<number>>(new Set())
  const isBundle = item.products.length >= 2
  const totalPrice = item.products.reduce((sum, p) => sum + (p.price || 0), 0)
  const bundleNote = item.products.find((p) => p.note && p.note.trim())?.note

  async function handleDownloadImage(ai: number, attachment: TaskAttachment) {
    if (downloadingIdx.has(ai)) return
    setDownloadingIdx((prev) => new Set(prev).add(ai))
    try {
      await downloadOne(
        attachment.url,
        attachmentFilename({ taskCode, taskTitle, itemIndex: index, imageIndex: ai, attachment })
      )
    } finally {
      setDownloadingIdx((prev) => {
        const next = new Set(prev)
        next.delete(ai)
        return next
      })
    }
  }

  async function handleDownloadItemImages() {
    if (itemDownloading || item.attachments.length === 0) return
    setItemDownloading(true)
    try {
      await downloadAll(
        item.attachments.map((attachment, ai) => ({
          url: attachment.url,
          filename: attachmentFilename({ taskCode, taskTitle, itemIndex: index, imageIndex: ai, attachment }),
        }))
      )
    } finally {
      setItemDownloading(false)
    }
  }

  return (
    <div className="bg-[#1a1a28] border border-white/10 rounded-lg p-2.5">
      {/* หัวรายการ — เป็น div (ไม่ใช่ button) เพราะมีปุ่ม "โหลด N รูป" ซ้อนอยู่ข้างใน
          (button ซ้อน button ผิด HTML spec, browser จะตัด DOM ให้เอง) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="text-[15px] font-medium text-white truncate min-w-0">
          {item.title || `รายการ ${index + 1}`}
        </span>
        <span className="shrink-0 flex items-center gap-1.5">
          {item.products.length > 0 && (
            <span className="text-[13px] px-2 py-0.5 rounded bg-white/5 text-[#94a3b8] whitespace-nowrap">
              {item.products.length} สินค้า
            </span>
          )}
          {item.attachments.length > 0 && (
            <>
              <button
                type="button"
                disabled={itemDownloading}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadItemImages()
                }}
                className="text-[13px] px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-300 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {itemDownloading ? "กำลังโหลด..." : `โหลด ${item.attachments.length} รูป`}
              </button>
              {/* ตัวเลขจำนวนรูปซ้ำกับปุ่มข้างๆ — ฟอนต์ใหญ่ขึ้นแล้วแถวนี้แน่นบนมือถือ
                  จึงโชว์เฉพาะจอกว้าง ไม่ให้ชื่อรายการโดนบีบจนอ่านไม่ออก */}
              <span className="hidden sm:inline text-[13px] px-2 py-0.5 rounded bg-white/5 text-[#94a3b8] whitespace-nowrap">
                {item.attachments.length} รูป
              </span>
            </>
          )}
          <svg
            className={`w-4 h-4 text-[#64748b] transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="mt-2 space-y-2.5">
          {item.detail && <p className="text-[14px] text-[#94a3b8] whitespace-pre-wrap">{item.detail}</p>}

          {item.products.length > 0 &&
            (isBundle ? (
              <div className="bg-[#1a1a28] border border-violet-500/25 border-l-2 border-l-violet-500/60 rounded-lg p-2.5">
                <span className="inline-block bg-violet-500/15 text-violet-300 text-[13px] px-1.5 py-0.5 rounded whitespace-nowrap mb-2">
                  ขายเป็นชุด · {item.products.length} ชิ้น
                </span>
                <div className="space-y-1.5">
                  {item.products.map((p, pi) => (
                    <div key={pi} className="flex items-center gap-1.5">
                      <ProductRow product={p} />
                      {pi < item.products.length - 1 && (
                        <span className="shrink-0 w-6 h-6 rounded-full bg-white/5 text-[#94a3b8] text-[14px] flex items-center justify-center">
                          ＋
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* หมายเหตุเป็นข้อความอิสระที่พนักงานพิมพ์เอง ("ราคาชุด 1,290" / "ใช้ 150 แต้ม")
                    → แสดงตามที่พิมพ์มา ห้ามเดาว่าเป็นราคาแล้วแปลงเป็น ฿ (จะผิดในเคสแลกแต้ม) */}
                <div className="mt-2 pt-2 border-t border-white/5 text-[14px] text-[#94a3b8]">
                  {bundleNote && <span className="text-violet-300">{bundleNote} · </span>}
                  ราคาปกติรวม {fmtBaht(totalPrice)}
                </div>
              </div>
            ) : (
              <ProductRow product={item.products[0]} />
            ))}

          {item.attachments.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {item.attachments.map((a, ai) => (
                <div key={ai} className="flex flex-col items-center gap-1">
                  <button type="button" onClick={() => onImageClick(a.url)} className="cursor-pointer">
                    <img
                      src={cldThumb(a.url, 240)}
                      alt={a.name}
                      className="w-20 h-20 rounded-lg object-cover bg-[#1e1e2e] border border-white/10"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden"
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={downloadingIdx.has(ai)}
                    onClick={() => handleDownloadImage(ai, a)}
                    className="text-[13px] text-cyan-400 hover:text-cyan-300 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {downloadingIdx.has(ai) ? "กำลังโหลด..." : "โหลดต้นฉบับ"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** แถวสินค้า 1 ชิ้น — 40×40 + ชื่อ + SKU · ราคา + note */
function ProductRow({ product }: { product: TaskProductRef }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {!imgError && product.image ? (
        <img
          src={cldThumb(product.image, 120)}
          alt=""
          className="w-12 h-12 rounded object-cover bg-[#1e1e2e] border border-white/10 shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded bg-[#1e1e2e] border border-white/10 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-white truncate">{product.name}</div>
        <div className="text-[13px] text-[#64748b] truncate">
          {product.sku} · {fmtBaht(product.price)}
        </div>
        {product.note && <div className="text-[13px] text-[#94a3b8] truncate">{product.note}</div>}
      </div>
    </div>
  )
}

/** คุยงาน — list คอมเมนต์ + ช่องพิมพ์ */
function TaskComments({
  task,
  commentText,
  setCommentText,
  sendComment,
  sending,
}: {
  task: Task
  commentText: string
  setCommentText: (v: string) => void
  sendComment: () => void
  sending: boolean
}) {
  return (
    <div>
      <div className="text-[15px] font-medium text-white mb-2">คุยงาน ({task.comments.length})</div>
      {task.comments.length > 0 && (
        <div className="space-y-2 mb-2 max-h-64 overflow-y-auto">
          {task.comments.map((c) => (
            <div key={c.id} className="bg-[#1a1a28] rounded-lg px-2.5 py-2">
              <div className="flex items-center gap-2 mb-0.5 min-w-0">
                <span className="text-[14px] font-medium text-white truncate">{c.authorName}</span>
                <span className="text-[13px] text-[#64748b] shrink-0">{relativeThai(c.createdAt)}</span>
              </div>
              <p className="text-[15px] text-[#cbd5e1] whitespace-pre-wrap">{c.text}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="พิมพ์ถึงกันตรงนี้..."
          rows={2}
          className="flex-1 min-w-0 px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base focus:border-[#94a3b8] outline-none resize-none"
        />
        <button
          type="button"
          disabled={sending || !commentText.trim()}
          onClick={sendComment}
          className="shrink-0 h-11 md:h-10 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          ส่ง
        </button>
      </div>
    </div>
  )
}
