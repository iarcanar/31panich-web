import { FieldLabel } from "./FieldLabel"

export function StepperInput({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  label,
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number
  label?: string
}) {
  const num = Number(value) || 0
  const dec = () => onChange(String(Math.max(min, num - step)))
  const inc = () => onChange(String(Math.min(max, num + step)))

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={dec}
          disabled={num <= min}
          className="p-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#94a3b8]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
          </svg>
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-center px-2 py-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] text-sm font-mono transition-colors duration-150 focus:border-[#94a3b8] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={inc}
          disabled={num >= max}
          className="p-1.5 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#94a3b8]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
