import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/*/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'civic-green': '#90ae4b',
        'civic-blue': '#153eb0',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
