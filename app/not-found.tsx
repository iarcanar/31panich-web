import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">ไม่พบหน้าที่คุณต้องการ</p>
        <Link
          href="/"
          className="bg-cyan-500 text-white font-semibold px-8 py-3 rounded-full hover:bg-cyan-400 transition"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  )
}
