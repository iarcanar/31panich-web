"use client"

import { createContext, useContext, useEffect, useId, useRef, useState } from "react"
import type { TaskAttachment } from "@/types/task"
import { MAX_ATTACHMENTS_PER_ITEM, MAX_ATTACHMENT_MB } from "@/types/task"
import { cldThumb } from "./status"
import { attachmentFilename, downloadOne } from "./download"

/** Lets a nested uploader report its busy state up to TaskEditor so the save
 *  button can disable while any image (in any item) is mid-upload — without
 *  widening the locked TaskItemEditor / TaskAttachmentUploader prop contracts.
 *  TaskEditor supplies the callback via `.Provider`; used standalone it's a no-op. */
export const UploadStatusContext = createContext<((id: string, busy: boolean) => void) | null>(null)

interface CloudinaryUploadResult {
  secure_url?: string
  width?: number
  height?: number
  bytes?: number
  format?: string
  error?: { message?: string }
}

/** Upload via XHR so we can stream progress (fetch doesn't expose upload progress).
 *  Copied from app/admin/reels/page.tsx per contract instructions. */
function uploadWithProgress(
  url: string,
  fd: FormData,
  onProgress: (pct: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener("load", () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(res)
        else reject(new Error(res.error?.message || `HTTP ${xhr.status}`))
      } catch {
        reject(new Error("Invalid Cloudinary response"))
      }
    })
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
    xhr.send(fd)
  })
}

export function TaskAttachmentUploader({
  value,
  onChange,
  nameContext,
}: {
  value: TaskAttachment[]
  onChange: (v: TaskAttachment[]) => void
  /** ให้ปุ่ม "โหลดต้นฉบับ" ตั้งชื่อไฟล์ให้ทีมทำสื่อรู้ว่าไฟล์เป็นของใบงาน/การ์ดไหน
   *  ไม่ใส่ (standalone) = fallback ไปใช้ชื่อไฟล์เดิมตอนอัปโหลด */
  nameContext?: { taskCode: string; taskTitle: string; itemIndex: number }
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  // Report busy state up to TaskEditor (see UploadStatusContext doc above)
  const reportUploading = useContext(UploadStatusContext)
  const uid = useId()
  useEffect(() => {
    reportUploading?.(uid, uploading)
    return () => reportUploading?.(uid, false)
  }, [uploading, uid, reportUploading])

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    const room = Math.max(0, MAX_ATTACHMENTS_PER_ITEM - value.length)
    const truncated = imageFiles.length > room
    const queue = imageFiles.slice(0, room)
    const errors = new Set<string>()
    if (truncated) {
      errors.add(`แนบได้สูงสุด ${MAX_ATTACHMENTS_PER_ITEM} รูปต่อรายการ — ตัดรูปส่วนเกินออกแล้ว`)
    }

    setError(null)

    if (queue.length === 0) {
      if (errors.size > 0) setError(Array.from(errors).join(" · "))
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    const uploaded: TaskAttachment[] = []
    setUploading(true)
    setStep({ done: 0, total: queue.length })
    try {
      for (const file of queue) {
        setProgress(0)
        if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
          errors.add("รูปใหญ่เกิน 10MB — ย่อรูปหรือถ่ายใหม่ก่อน")
          setStep((s) => ({ ...s, done: s.done + 1 }))
          continue
        }
        try {
          // keepOriginal: true → sign route must NOT force format=webp (no format in
          // the signed params), so we only append `format` when the sign response
          // actually includes one — otherwise the Cloudinary signature mismatches.
          const signRes = await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder: "tasks", resourceType: "image", keepOriginal: true }),
          })
          const sign = await signRes.json()
          if (!sign.signature) throw new Error(sign.error || "sign failed")

          const fd = new FormData()
          fd.append("file", file)
          fd.append("api_key", sign.apiKey)
          fd.append("timestamp", String(sign.timestamp))
          fd.append("signature", sign.signature)
          fd.append("folder", sign.folder)
          if (sign.format) fd.append("format", sign.format)

          const result = await uploadWithProgress(
            `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
            fd,
            (pct) => setProgress(pct)
          )
          if (!result.secure_url) throw new Error(result.error?.message || "upload failed")

          uploaded.push({
            url: result.secure_url,
            name: file.name,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          })
        } catch {
          errors.add("อัปโหลดรูปไม่สำเร็จ ลองอีกครั้ง")
        }
        setStep((s) => ({ ...s, done: s.done + 1 }))
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded])
      if (errors.size > 0) setError(Array.from(errors).join(" · "))
    } finally {
      setUploading(false)
      setProgress(0)
      setStep({ done: 0, total: 0 })
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  const atLimit = value.length >= MAX_ATTACHMENTS_PER_ITEM

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-[15px] px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((a, i) => (
            <AttachmentThumb
              key={`${a.url}-${i}`}
              a={a}
              index={i}
              nameContext={nameContext}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>
      )}

      {uploading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[15px] text-amber-300 font-medium whitespace-nowrap">
              กำลังอัปโหลด {Math.min(step.done + 1, step.total)}/{step.total}...
            </span>
            <span className="text-[14px] text-amber-300 font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-200"
              style={{ width: `${Math.max(3, progress)}%` }}
            />
          </div>
        </div>
      )}

      {atLimit ? (
        <p className="text-[14px] text-[#94a3b8]">
          ครบ {MAX_ATTACHMENTS_PER_ITEM} รูปแล้ว — ลบรูปที่ไม่ใช้ก่อนจึงเพิ่มได้
        </p>
      ) : (
        /* ฟอนต์ใหญ่ขึ้นแล้วข้อความปุ่มยาวกว่าความกว้างการ์ดบนมือถือ —
           ปล่อยให้ตัดบรรทัดได้ (min-h แทน h ตายตัว) ไม่งั้นข้อความล้นออกนอกกรอบ */
        <label
          className={`inline-flex items-center min-h-[44px] max-w-full px-3 py-2 rounded-lg border text-[15px] font-medium leading-snug transition-colors th-text ${
            uploading
              ? "bg-[#2a2a3a] border-white/10 text-[#64748b] cursor-not-allowed"
              : "bg-white/5 border-white/10 text-[#e2e8f0] hover:border-teal-400/40 cursor-pointer"
          }`}
        >
          {uploading
            ? "รอรูปอัปเสร็จ..."
            : value.length > 0
              ? `+ เพิ่มรูปอีก (${value.length}/${MAX_ATTACHMENTS_PER_ITEM})`
              : "+ แนบรูปของการ์ดนี้ (เลือกหลายรูปพร้อมกันได้)"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
            disabled={uploading}
          />
        </label>
      )}
      <p className="text-[13px] text-[#64748b]">เก็บรูปคมชัดเต็มขนาด ไม่ย่อไฟล์</p>
    </div>
  )
}

function AttachmentThumb({
  a,
  index,
  nameContext,
  onRemove,
}: {
  a: TaskAttachment
  index: number
  nameContext?: { taskCode: string; taskTitle: string; itemIndex: number }
  onRemove: () => void
}) {
  const [broken, setBroken] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const mb = a.bytes ? (a.bytes / 1024 / 1024).toFixed(1) : null
  const dims = a.width && a.height ? `${a.width}×${a.height}` : ""

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const filename = nameContext
        ? attachmentFilename({
            taskCode: nameContext.taskCode,
            taskTitle: nameContext.taskTitle,
            itemIndex: nameContext.itemIndex,
            imageIndex: index,
            attachment: a,
          })
        : a.name
      await downloadOne(a.url, filename)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-w-0">
      <div className="relative w-20 h-20">
        {broken || !a.url ? (
          <div className="w-20 h-20 rounded-lg bg-[#1e1e2e] border border-white/10 flex items-center justify-center text-[#64748b] text-[13px] text-center px-1">
            รูปหาย
          </div>
        ) : (
          <img
            src={cldThumb(a.url, 240)}
            alt={a.name}
            className="w-20 h-20 rounded-lg object-cover bg-[#1e1e2e] border border-white/10"
            onError={() => setBroken(true)}
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 text-white text-[14px] leading-none flex items-center justify-center transition-colors cursor-pointer"
          aria-label="เอาออก"
        >
          ×
        </button>
      </div>
      <div className="text-[13px] text-[#64748b] truncate w-20">
        {dims}
        {mb ? `${dims ? " · " : ""}${mb}MB` : ""}
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="text-[13px] text-teal-300 hover:text-teal-200 truncate block w-20 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? "กำลังโหลด..." : "โหลดต้นฉบับ"}
      </button>
    </div>
  )
}
