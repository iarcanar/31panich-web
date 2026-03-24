import Image from "next/image"
import { CATALOGS } from "@/lib/catalogs"

export default function CatalogSection() {
  return (
    <section className="bg-[#0e0e14] pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8 max-w-6xl mx-auto">
          {CATALOGS.map((cat) => (
            <div
              key={cat.id}
              className="bg-[#1a1a28] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group flex flex-col"
            >
              <div className="aspect-[3/4] relative flex items-center justify-center overflow-hidden">
                <Image
                  src={cat.image}
                  alt={`${cat.brand} Catalog`}
                  width={400}
                  height={400}
                  className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3 sm:p-6 text-center flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-xl mb-1 sm:mb-2">{cat.brand}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">{cat.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-3 sm:mt-5">
                  <a
                    href={cat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 text-xs sm:text-sm font-semibold px-4 py-2 sm:px-6 sm:py-2.5 rounded-full shadow-lg shadow-emerald-500/20 hover:opacity-90 transition"
                  >
                    ดูแคตตาล็อก
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
