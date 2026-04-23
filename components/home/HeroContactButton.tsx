"use client"

import ContactLink from "@/components/ui/ContactLink"

interface Props {
  className?: string
}

export default function HeroContactButton({ className = "" }: Props) {
  return (
    <ContactLink
      type="phone"
      className={className}
      openClassName="sci-fi-button"
      showHoursWhenClosed
    >
      โทรสั่งเลย
    </ContactLink>
  )
}
