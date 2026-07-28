export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  dataField,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
  /** Optional data attribute used by AI enrich UI to flash specific fields */
  dataField?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-field={dataField}
      className={`w-full px-3 py-2 bg-[#1e1e2e] border border-[#2a2a3a] rounded-lg text-[#f1f5f9] placeholder-[#64748b] text-base md:text-sm transition-colors duration-150 focus:border-[#94a3b8] outline-none ${mono ? "font-mono" : ""} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  )
}
