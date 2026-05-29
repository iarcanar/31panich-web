"use client"

import ContactLink from "@/components/ui/ContactLink"

interface Props {
  className?: string
  /** Override the active-state (store-open) class. Defaults to the sci-fi shimmer.
   *  Pass "" for a plain solid button — e.g. the mobile hero amber CTA, where the
   *  cyan shimmer would fight the solid fill. */
  openClassName?: string
}

export default function HeroContactButton({ className = "", openClassName = "sci-fi-button" }: Props) {
  return (
    <ContactLink
      type="phone"
      className={className}
      openClassName={openClassName}
      showHoursWhenClosed
    >
      โทรสั่งเลย
    </ContactLink>
  )
}
