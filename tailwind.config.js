/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cmb-red': '#C8161D',
        'cmb-bg': '#F5F7FA',
        'cmb-text': '#1F2937',
        'cmb-subtext': '#6B7280',
        'sidebar-bg': '#111827',
        'match': '#059669',
        'match-bg': '#D1FAE5',
        'missing': '#D97706',
        'missing-bg': '#FEF3C7',
        'variance': '#DC2626',
        'variance-bg': '#FEE2E2',
      },
      borderRadius: {
        'md': '4px',
      },
    },
  },
  plugins: [],
}
