interface Props {
  children: React.ReactNode
  accentColor?: string
  center?: boolean
  className?: string
}

export default function SectionHeading({ children, accentColor = "from-cyan-400 to-blue-500", center, className }: Props) {
  return (
    <div className={`flex items-center gap-3 ${center ? "justify-center" : ""} ${className ?? ""}`}>
      {!center && <div className={`h-6 w-1 rounded-full bg-gradient-to-b ${accentColor}`} />}
      <h2 className="text-2xl md:text-3xl font-bold text-white">{children}</h2>
    </div>
  )
}
