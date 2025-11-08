import type { Config } from "tailwindcss";
import { BRAND_COLORS } from "./lib/theme/colors";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/*/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'civic-green': BRAND_COLORS.green,
        'civic-green-dark': '#7a9a45', // darker variant of civic-green
        'civic-blue': BRAND_COLORS.blue,
        'brand-primary': '#003d5c', // dark navy
        'brand-accent': '#fba92e', // amber/orange
        'neutral-bg': '#f7f9fc', // off-white
        'info-tint': '#fff8e6', // pale tint
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
