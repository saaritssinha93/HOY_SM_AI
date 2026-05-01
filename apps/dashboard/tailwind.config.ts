import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // HOY brand palette — adjust once Vanshika picks final colors
        ink: "#1a1a1a",
        cream: "#faf7f0",
        accent: "#c8956d", // warm gold-ish, anti-tarnish reference
      },
    },
  },
  plugins: [],
} satisfies Config;
