"use client"

import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"

export function Barcode({
  value,
  variant = "white",
}: {
  value: string
  /** "white" = black on white (product table); "transparent" = grey on transparent (coupon preview) */
  variant?: "white" | "transparent"
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !value) return
    try {
      const isWhite = variant === "white"
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: isWhite ? 1.2 : 1.5,
        height: isWhite ? 30 : 40,
        displayValue: true,
        fontSize: isWhite ? 11 : 12,
        font: "monospace",
        textMargin: 2,
        margin: 6,
        marginBottom: 8,
        background: isWhite ? "#ffffff" : "transparent",
        lineColor: isWhite ? "#000000" : "#94a3b8",
      })
    } catch {
      // invalid barcode value — leave blank
    }
  }, [value, variant])

  if (!value) return <span className="text-[#2a2a3a] text-[10px]">—</span>
  return <svg ref={svgRef} className={variant === "white" ? "rounded" : "mt-2"} />
}
