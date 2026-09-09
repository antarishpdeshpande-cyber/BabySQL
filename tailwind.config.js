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
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        accent: "var(--color-accent)",
        muted: "var(--color-muted)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
