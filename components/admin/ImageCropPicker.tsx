"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface Props {
  onConfirm: (file: File, crop: { x: number; y: number; size: number }) => void
  onCancel: () => void
}

/**
 * 1:1 image crop picker — user selects an image, drags to position the crop area,
 * then confirms. Returns the original file + crop coordinates for server-side processing.
 */
export default function ImageCropPicker({ onConfirm, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [naturalW, setNaturalW] = useState(0)
  const [naturalH, setNaturalH] = useState(0)

  // Crop state: normalized 0-1 values relative to natural image
  const [cropY, setCropY] = useState(0) // only Y moves (1:1 box, width = min dimension)
  const [cropX, setCropX] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, startCropX: 0, startCropY: 0 })

  // Derived: crop size = min(w, h) in natural pixels
  const cropSize = Math.min(naturalW, naturalH)
  const maxOffsetX = naturalW - cropSize
  const maxOffsetY = naturalH - cropSize

  // Clean up object URL
  useEffect(() => {
    return () => { if (imgUrl) URL.revokeObjectURL(imgUrl) }
  }, [imgUrl])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setImgUrl(url)
    const img = new Image()
    img.onload = () => {
      setNaturalW(img.naturalWidth)
      setNaturalH(img.naturalHeight)
      // Center crop by default
      const size = Math.min(img.naturalWidth, img.naturalHeight)
      setCropX((img.naturalWidth - size) / 2 / img.naturalWidth)
      setCropY((img.naturalHeight - size) / 2 / img.naturalHeight)
    }
    img.src = url
  }

  // Convert normalized crop position to pixel values for display
  const displayCropX = cropX * naturalW
  const displayCropY = cropY * naturalH

  // Mouse/touch drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, startCropX: cropX, startCropY: cropY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [cropX, cropY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Scale factor: display size vs natural size
    const scaleX = naturalW / rect.width
    const scaleY = naturalH / rect.height
    const dx = (e.clientX - dragStart.current.x) * scaleX
    const dy = (e.clientY - dragStart.current.y) * scaleY

    const newX = Math.max(0, Math.min(maxOffsetX, dragStart.current.startCropX * naturalW + dx)) / naturalW
    const newY = Math.max(0, Math.min(maxOffsetY, dragStart.current.startCropY * naturalH + dy)) / naturalH

    setCropX(newX)
    setCropY(newY)
  }, [naturalW, naturalH, maxOffsetX, maxOffsetY])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  function handleConfirm() {
    if (!file) return
    onConfirm(file, {
      x: Math.round(displayCropX),
      y: Math.round(displayCropY),
      size: cropSize,
    })
  }

  // ─── No file selected yet: show file picker ───
  if (!imgUrl || !naturalW) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl p-6 mx-4 w-full max-w-sm text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-[#1e1e2e] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">เลือกภาพคูปอง</h3>
            <p className="text-xs text-[#64748b]">จะครอบเป็น 1:1 ให้เลือกตำแหน่งได้</p>
          </div>
          <label className="block px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer mb-3">
            เลือกภาพ
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
          <button onClick={onCancel} className="text-sm text-[#64748b] hover:text-white transition-colors cursor-pointer">ยกเลิก</button>
        </div>
      </div>
    )
  }

  // ─── Crop UI ───
  // Display image fitted to container, overlay dark outside crop area
  const isLandscape = naturalW >= naturalH
  const cropRatioX = displayCropX / naturalW
  const cropRatioY = displayCropY / naturalH
  const cropRatioSize = cropSize / naturalW // relative to image width for display
  const cropRatioSizeH = cropSize / naturalH // relative to image height for display

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#13131d] border border-[#2a2a3a] rounded-xl mx-4 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">เลือกตำแหน่งครอบ 1:1</h3>
          <span className="text-[10px] text-[#64748b]">ลากเพื่อเลื่อนตำแหน่ง</span>
        </div>

        {/* Crop area */}
        <div className="relative bg-black">
          <div
            ref={containerRef}
            className="relative w-full select-none touch-none"
            style={{ aspectRatio: `${naturalW} / ${naturalH}` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Full image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt="" className="w-full h-full object-contain pointer-events-none" draggable={false} />

            {/* Dark overlay outside crop — 4 rectangles */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top */}
              <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${cropRatioY * 100}%` }} />
              {/* Bottom */}
              <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: `${(1 - cropRatioY - cropRatioSizeH) * 100}%` }} />
              {/* Left */}
              <div className="absolute bg-black/60" style={{ top: `${cropRatioY * 100}%`, left: 0, width: `${cropRatioX * 100}%`, height: `${cropRatioSizeH * 100}%` }} />
              {/* Right */}
              <div className="absolute bg-black/60" style={{ top: `${cropRatioY * 100}%`, right: 0, width: `${(1 - cropRatioX - cropRatioSize) * 100}%`, height: `${cropRatioSizeH * 100}%` }} />

              {/* Crop border */}
              <div
                className="absolute border-2 border-white/80 rounded-sm"
                style={{
                  top: `${cropRatioY * 100}%`,
                  left: `${cropRatioX * 100}%`,
                  width: `${cropRatioSize * 100}%`,
                  height: `${cropRatioSizeH * 100}%`,
                }}
              >
                {/* Grid lines (rule of thirds) */}
                <div className="absolute inset-0">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                </div>
                {/* Move icon center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/50 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview + actions */}
        <div className="px-4 py-3 border-t border-[#2a2a3a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mini 1:1 preview */}
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt=""
                className="pointer-events-none"
                draggable={false}
                style={{
                  width: `${(naturalW / cropSize) * 100}%`,
                  height: `${(naturalH / cropSize) * 100}%`,
                  marginLeft: `-${(displayCropX / cropSize) * 100}%`,
                  marginTop: `-${(displayCropY / cropSize) * 100}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-[#64748b]">{cropSize}×{cropSize} px</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-[#94a3b8] hover:text-white transition-colors cursor-pointer">ยกเลิก</button>
            <button onClick={handleConfirm} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
              ตกลง
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
