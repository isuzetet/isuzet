import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F6E56", // Deep teal
          accent: "#BA7517",  // Warm amber
          danger: "#A32D2D",  // Deep red
          success: "#1D9E75", // Teal-green
        },
        isuzet: {
          bg: "#0D1117",
          surface: "#161B22",
          border: "#30363D",
          text: "#E6EDF3",
          secondary: "#7D8590",
        },
        status: {
          open: "#BA7517",
          matching: "#185FA5",
          offered: "#534AB7",
          transit: "#0F6E56",
          delivered: "#3B6D11",
          disputed: "#A32D2D",
          cancelled: "#5F5E5A",
          unmatched: "#854F0B",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0F6E56",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#161B22",
          foreground: "#E6EDF3",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;