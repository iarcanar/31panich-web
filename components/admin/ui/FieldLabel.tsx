export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}
