"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import type { Reel } from "@/types/reel"
import { useAuth } from "../layout"
import {
  FieldLabel,
  TextInput,
  Toggle,
} from "@/components/admin/ui"

const EMPTY_FORM = {
  title: "",
  poster: "",
  previewMp4: "",
  facebookUrl: "",
  active: true,
  order: 0,
}

type FormState = typeof EMPTY_FORM

/** Upload via XHR so we can stream progress (fetch doesn't expose upload progress). */
function uploadWithProgress(
  url: string,
  fd: FormData,
  onProgress: (pct: number) => void
): Promise<{ secure_url?: string; bytes?: number; eager?: { secure_url: string; bytes: number }[]; error?: { message?: string } }> {
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

export default function AdminReelsPage() {
  const { isAdmin } = useAuth()
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoReduction, setVideoReduction] = useState<{ original: string; compressed: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const fetchReels = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/reels?all=true")
      const data = await r.json()
      if (Array.isArray(data)) setReels(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchReels() }, [fetchReels])

  function openNew() {
    setForm({ ...EMPTY_FORM, order: reels.length })
    setEditingId(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(r: Reel) {
    setForm({
      title: r.title,
      poster: r.poster,
      previewMp4: r.previewMp4 || "",
      facebookUrl: r.facebookUrl,
      active: r.active,
      order: r.order,
    })
    setEditingId(r.id)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
    setShowForm(false)
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    setUploadingPoster(true)
    setError(null)
    try {
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "reels",
          transformation: "c_fill,w_720,h_1280,q_auto",
        }),
      })
      const sign = await signRes.json()
      if (!sign.signature) throw new Error(sign.error || "sign failed")

      const fd = new FormData()
      fd.append("file", file)
      fd.append("api_key", sign.apiKey)
      fd.append("timestamp", String(sign.timestamp))
      fd.append("signature", sign.signature)
      fd.append("folder", sign.folder)
      fd.append("format", sign.format)
      if (sign.transformation) fd.append("transformation", sign.transformation)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      })
      const result = await res.json()
      if (result.secure_url) {
        setForm((prev) => ({ ...prev, poster: result.secure_url }))
      } else {
        throw new Error(result.error?.message || "upload failed")
      }
    } catch (err) {
      setError("อัพโหลด poster ไม่สำเร็จ: " + (err instanceof Error ? err.message : "unknown"))
    } finally {
      setUploadingPoster(false)
      if (posterInputRef.current) posterInputRef.current.value = ""
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("video/")) return
    const MAX_MB = 95 // Cloudinary free plan: 100MB, leave headroom
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`ไฟล์ใหญ่เกิน ${MAX_MB}MB (ของคุณ ${(file.size / 1024 / 1024).toFixed(1)}MB) — กรุณาตัดให้เล็กกว่านี้`)
      if (videoInputRef.current) videoInputRef.current.value = ""
      return
    }
    setUploadingVideo(true)
    setVideoProgress(0)
    setVideoReduction(null)
    setError(null)
    try {
      // Eager transform: portrait 720×1280, auto quality (vc_auto codec), 5s max, no audio, format mp4
      // Result: stored derivative ~1-5MB regardless of input size (20-40MB source is fine)
      const eagerTransform = "c_fill,w_720,h_1280,q_auto,du_5,ac_none,f_mp4"
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "reels/previews",
          resourceType: "video",
          eager: eagerTransform,
        }),
      })
      const sign = await signRes.json()
      if (!sign.signature) throw new Error(sign.error || "sign failed")

      const fd = new FormData()
      fd.append("file", file)
      fd.append("api_key", sign.apiKey)
      fd.append("timestamp", String(sign.timestamp))
      fd.append("signature", sign.signature)
      fd.append("folder", sign.folder)
      fd.append("eager", eagerTransform)

      const result = await uploadWithProgress(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`,
        fd,
        (pct) => setVideoProgress(pct)
      )

      // Prefer eager derivative (transformed, small) over original secure_url
      const eager = Array.isArray(result.eager) ? result.eager[0] : null
      const finalUrl = eager?.secure_url || result.secure_url
      if (!finalUrl) throw new Error(result.error?.message || "upload failed")

      setForm((prev) => ({ ...prev, previewMp4: finalUrl }))
      if (eager?.bytes) {
        setVideoReduction({
          original: (file.size / 1024 / 1024).toFixed(1),
          compressed: (eager.bytes / 1024 / 1024).toFixed(1),
        })
      }
    } catch (err) {
      setError("อัพโหลดวิดีโอไม่สำเร็จ: " + (err instanceof Error ? err.message : "unknown"))
    } finally {
      setUploadingVideo(false)
      setVideoProgress(0)
      if (videoInputRef.current) videoInputRef.current.value = ""
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("กรุณาใส่ชื่อ Reel"); return }
    if (!form.poster) { setError("กรุณาอัพโหลด poster"); return }
    if (!form.facebookUrl.trim()) { setError("กรุณาใส่ Facebook URL"); return }

    setSaving(true)
    setError(null)
    try {
      const body = {
        title: form.title.trim(),
        poster: form.poster,
        previewMp4: form.previewMp4 || undefined,
        facebookUrl: form.facebookUrl.trim(),
        active: form.active,
        order: form.order,
      }
      const url = editingId ? `/api/admin/reels/${editingId}` : `/api/admin/reels`
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      await fetchReels()
      closeForm()
    } catch (err) {
      setError("บันทึกไม่สำเร็จ: " + (err instanceof Error ? err.message : "unknown"))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(r: Reel) {
    await fetch(`/api/admin/reels/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    })
    fetchReels()
  }

  async function handleDelete(r: Reel) {
    if (!confirm(`ลบ Reel "${r.title}" ออกจากหน้าเว็บ?`)) return
    const res = await fetch(`/api/admin/reels/${r.id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error === "forbidden" ? "ต้องเป็น Admin เท่านั้นถึงจะลบได้" : "ลบไม่สำเร็จ")
      return
    }
    fetchReels()
  }

  async function handleMove(r: Reel, direction: -1 | 1) {
    const sorted = [...reels].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((x) => x.id === r.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const newOrder = [...sorted]
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    await fetch(`/api/admin/reels`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: newOrder.map((x) => x.id) }),
    })
    fetchReels()
  }

  const sorted = [...reels].sort((a, b) => a.order - b.order)

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white">จัดการ Reels</h1>
          <p className="text-[11px] md:text-xs text-[#64748b] mt-0.5">วิดีโอ Facebook Reel ที่จะแสดงในหน้าแรก — แนะนำใส่ 4-6 รายการ</p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          + เพิ่ม Reel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#64748b] text-sm">กำลังโหลด...</div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#13131d] border border-dashed border-[#2a2a3a] rounded-xl p-8 text-center">
          <div className="text-[#64748b] text-sm mb-3">ยังไม่มี Reel</div>
          <button
            onClick={openNew}
            className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            เพิ่มตัวแรก
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, i) => (
            <div
              key={r.id}
              className={`bg-[#13131d] border rounded-xl p-3 flex items-center gap-3 ${r.active ? "border-white/10" : "border-dashed border-white/10 opacity-60"}`}
            >
              {/* Poster thumbnail */}
              <div className="relative w-14 h-24 shrink-0 rounded-lg overflow-hidden bg-[#1e1e2e]">
                {r.poster && (
                  <Image src={r.poster} alt={r.title} fill className="object-cover" sizes="56px" />
                )}
                {r.previewMp4 && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center" title="มี preview video">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{r.title}</div>
                <div className="text-[11px] text-[#64748b] truncate">{r.facebookUrl}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${r.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
                    {r.active ? "แสดง" : "ซ่อน"}
                  </span>
                  {r.previewMp4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/30 font-medium">
                      มี preview
                    </span>
                  )}
                  <span className="text-[10px] text-[#475569]">ลำดับ {i + 1}</span>
                </div>
              </div>
              {/* Actions: stacked into 2 rows */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMove(r, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-[#94a3b8] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center"
                    title="เลื่อนขึ้น"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMove(r, 1)}
                    disabled={i === sorted.length - 1}
                    className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-[#94a3b8] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center"
                    title="เลื่อนลง"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(r)}
                    className="h-7 px-2 rounded text-[10px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {r.active ? "ซ่อน" : "แสดง"}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="h-7 px-2 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    แก้ไข
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(r)}
                      className="h-7 w-7 rounded text-[10px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer flex items-center justify-center"
                      title="ลบ"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={closeForm}>
          <div
            className="bg-[#13131d] border border-[#2a2a3a] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#13131d] border-b border-[#2a2a3a] px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingId ? "แก้ไข Reel" : "เพิ่ม Reel ใหม่"}
              </h3>
              <button onClick={closeForm} className="text-[#64748b] hover:text-white text-lg leading-none cursor-pointer" aria-label="close">×</button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <FieldLabel required>ชื่อ Reel</FieldLabel>
                <TextInput
                  value={form.title}
                  onChange={(v) => setForm({ ...form, title: v.slice(0, 80) })}
                  placeholder="เช่น: รีวิวสีเบเยอร์ Cool Plus"
                />
              </div>

              <div>
                <FieldLabel required>Facebook Reel URL</FieldLabel>
                <TextInput
                  value={form.facebookUrl}
                  onChange={(v) => setForm({ ...form, facebookUrl: v })}
                  placeholder="https://www.facebook.com/.../videos/..."
                />
                <p className="text-[10px] text-[#64748b] mt-1">
                  ใช้ link Reel จาก Facebook — เปิดใน modal ด้วย iframe embed
                </p>
              </div>

              <div>
                <FieldLabel required>Poster (ภาพปก 9:16 แนวตั้ง)</FieldLabel>
                {form.poster ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-28 rounded-lg overflow-hidden bg-[#1e1e2e] border border-white/10">
                      <Image src={form.poster} alt="poster" fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#64748b] truncate">{form.poster}</div>
                      <button
                        onClick={() => setForm({ ...form, poster: "" })}
                        className="mt-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`block h-10 rounded-lg border border-dashed border-white/20 hover:border-amber-500/60 text-center py-2 text-xs cursor-pointer transition-colors ${uploadingPoster ? "bg-amber-500/10 text-amber-300" : "bg-[#1a1a28] text-[#94a3b8]"}`}>
                    {uploadingPoster ? "กำลังอัพโหลด..." : "เลือกรูป poster (JPG/PNG, จะแปลงเป็น WebP)"}
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePosterUpload}
                      disabled={uploadingPoster}
                    />
                  </label>
                )}
              </div>

              <div>
                <FieldLabel>Preview video (แนวตั้ง) — ไม่บังคับ</FieldLabel>
                {form.previewMp4 ? (
                  <div className="flex items-center gap-3">
                    <video
                      src={form.previewMp4}
                      className="w-16 h-28 rounded-lg object-cover bg-black border border-white/10"
                      muted
                      playsInline
                      autoPlay
                      loop
                    />
                    <div className="flex-1 min-w-0">
                      {videoReduction && (
                        <div className="text-[11px] text-emerald-400 font-medium mb-0.5">
                          ✓ ย่อจาก {videoReduction.original}MB → {videoReduction.compressed}MB
                        </div>
                      )}
                      <div className="text-[10px] text-[#64748b] truncate">{form.previewMp4}</div>
                      <button
                        onClick={() => { setForm({ ...form, previewMp4: "" }); setVideoReduction(null) }}
                        className="mt-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ) : uploadingVideo ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-amber-300 font-medium">
                        {videoProgress < 100 ? "กำลังอัพโหลด..." : "กำลังย่อไฟล์ (ตัด 5 วิ + ลบเสียง)..."}
                      </span>
                      <span className="text-[11px] text-amber-300 font-mono">
                        {videoProgress < 100 ? `${videoProgress}%` : "..."}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-amber-500 transition-all duration-200 ${videoProgress === 100 ? "animate-pulse" : ""}`}
                        style={{ width: `${Math.max(3, videoProgress)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#94a3b8] mt-1.5">
                      {videoProgress < 100
                        ? "ส่งไฟล์เข้า Cloudinary..."
                        : "ระบบกำลังแปลง ย่อขนาด ตัด 5 วินาทีแรก และลบเสียง — รอสักครู่"}
                    </p>
                  </div>
                ) : (
                  <label className="block rounded-lg border border-dashed border-white/20 hover:border-amber-500/60 text-center py-3 px-3 text-xs cursor-pointer transition-colors bg-[#1a1a28] text-[#94a3b8]">
                    <div className="font-medium">เลือกวิดีโอ (MP4/MOV/WebM ≤95MB)</div>
                    <div className="text-[10px] text-[#64748b] mt-0.5">
                      ระบบจะย่อ + ตัด 5 วิ + ลบเสียง ให้อัตโนมัติ
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                      className="hidden"
                      onChange={handleVideoUpload}
                      disabled={uploadingVideo}
                    />
                  </label>
                )}
                <p className="text-[10px] text-[#64748b] mt-1">
                  ใส่ไฟล์ดิบๆ 20-40MB ได้เลย — ระบบแปลง/ย่อให้ ขนาดสุดท้าย ~1-3MB ต่อเรื่อง
                </p>
              </div>

              <Toggle
                label="แสดงบนหน้าเว็บ"
                checked={form.active}
                onChange={(v) => setForm({ ...form, active: v })}
                color="emerald"
              />
            </div>

            <div className="sticky bottom-0 bg-[#13131d] border-t border-[#2a2a3a] px-4 py-3 flex items-center justify-end gap-2">
              <button
                onClick={closeForm}
                className="h-9 px-4 text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingPoster || uploadingVideo}
                className="h-9 px-5 bg-amber-600 hover:bg-amber-500 disabled:bg-[#2a2a3a] disabled:text-[#64748b] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "กำลังบันทึก..." : editingId ? "บันทึก" : "เพิ่ม Reel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
