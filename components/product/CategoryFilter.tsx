import Link from "next/link"
import { CATEGORIES } from "@/lib/categories"

export default function CategoryFilter({ current }: { current: string }) {
  return (
    <aside className="hidden md:block w-48 shrink-0">
      <h3 className="font-semibold text-gray-900 mb-3">หมวดหมู่</h3>
      <ul className="space-y-1">
        {CATEGORIES.map((cat) => (
          <li key={cat.value}>
            <Link
              href={`/products/${cat.value}`}
              className={`block px-3 py-2 rounded-lg text-sm transition ${
                current === cat.value
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
