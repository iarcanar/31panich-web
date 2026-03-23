import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        thai: ["var(--font-thai)", "sans-serif"],
        sans: ["var(--font-latin)", "var(--font-thai)", "sans-serif"],
      },
      colors: {
        brand: {
          blue: "#1e3a5f",
          purple: "#4a1d96",
          cyan: "#22d3ee",
        },
      },
    },
  },
  plugins: [],
}

export default config
