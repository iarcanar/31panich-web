type ToggleColor = "primary" | "emerald" | "amber" | "cyan"

const COLORS: Record<ToggleColor, string> = {
  primary: "bg-[#94a3b8]",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
}

export function Toggle({
  checked,
  onChange,
  label,
  color = "primary",
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  color?: ToggleColor
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 group cursor-pointer"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? COLORS[color] : "bg-[#1e1e2e] border border-[#2a2a3a]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
      <span
        className={`text-sm transition-colors ${
          checked ? "text-[#f1f5f9]" : "text-[#64748b]"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
          checked
            ? color === "emerald"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : color === "amber"
              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
              : color === "cyan"
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              : "bg-[#94a3b8]/20 border-[#94a3b8]/40 text-[#94a3b8]"
            : "bg-[#1e1e2e] border-[#2a2a3a] text-[#64748b]"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  )
}
