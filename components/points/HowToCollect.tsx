import LiquidGlass from "@/components/ui/LiquidGlass"
import { LINE_POINTS_URL } from "@/lib/store-config"
import { ShoppingBagIcon, CoinStackIcon, CheckPointsIcon } from "./PointsIcons"

const ITEMS = [
  { Icon: ShoppingBagIcon, title: "ช้อปครบ 500 บาท", sub: "รับทันที 1 แต้ม" },
  { Icon: CoinStackIcon, title: "สะสมได้ไม่อั้น", sub: "ยิ่งช้อปยิ่งได้แต้มเยอะ" },
  { Icon: CheckPointsIcon, title: "เช็คแต้มคงเหลือ", sub: "กดเพื่อตรวจสอบแต้มของคุณ", link: LINE_POINTS_URL },
]

export default function HowToCollect() {
  return (
    <LiquidGlass
      lens
      radius={28}
      bevel={14}
      strength={66}
      frost={1}
      tint="linear-gradient(180deg, rgba(58,38,104,0.46), rgba(22,15,40,0.56))"
      className="relative max-w-3xl mx-auto p-8 overflow-hidden"
    >
      {/* bottom rim light — purple/white, like the reference's rimBottom */}
      <div
        className="absolute left-8 right-8 bottom-0 h-[2px] rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(216,180,254,0.65) 28%, rgba(255,255,255,0.85) 50%, rgba(216,180,254,0.65) 72%, transparent)",
        }}
      />

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-b from-white to-purple-300 bg-clip-text text-transparent">
          สะสมแต้มง่ายๆ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {ITEMS.map(({ Icon, title, sub, link }, i) => {
            const content = (
              <>
                <div className="glass-card w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-200 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-8 h-8" />
                </div>
                <p className="text-white font-semibold">{title}</p>
                <p className="text-purple-200/70 text-sm mt-1">{sub}</p>
              </>
            )
            return link ? (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-center group cursor-pointer">
                {content}
              </a>
            ) : (
              <div key={i} className="text-center group cursor-default">
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </LiquidGlass>
  )
}
