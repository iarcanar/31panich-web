// Flat monotone line icons for the points page — lucide/feather style.
// viewBox 24, no fill, stroke=currentColor (tint via parent text color),
// uniform 1.75 stroke, round caps/joins. No gradients, no shadows.
// Replaces the old 3D game-art webp + skeuomorphic gold-coin SVG.

interface IconProps {
  className?: string
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Shopping bag — "ช้อปครบ 500 บาท" */
export function ShoppingBagIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <path d="M5 7h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.4H7.5A1.5 1.5 0 0 1 6 19.5L5 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      <path d="M9 11.5a3 3 0 0 0 6 0" />
    </svg>
  )
}

/** Stacked coins — "สะสมได้ไม่อั้น" */
export function CoinStackIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    </svg>
  )
}

/** Magnifier with check — "เช็คแต้มคงเหลือ" */
export function CheckPointsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-3.6-3.6" />
      <path d="M8 11l2.2 2.2L14 9.4" />
    </svg>
  )
}
