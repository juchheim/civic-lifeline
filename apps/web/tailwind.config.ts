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
        'civic-blue': BRAND_COLORS.blue,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
