"use client"

import dynamic from "next/dynamic"

const PromoPopup = dynamic(() => import("./PromoPopup"), { ssr: false })

export default function PromoPopupLazy() {
  return <PromoPopup />
}
