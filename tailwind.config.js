/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0e17",
        surface: "#111827",
        "surface-raised": "#1a2234",
        border: "#1f293d",
        primary: "#06b6d4",
        "primary-hover": "#0891b2",
        accent: "#10b981",
        muted: "#64748b",
        danger: "#f43f5e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
