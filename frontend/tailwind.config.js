/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        navy: { 950: '#0b1020', 900: '#0f172a', 800: '#1e293b', 700: '#334155', 600: '#475569', 500: '#64748b', 400: '#94a3b8' },
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
        income: { DEFAULT: '#059669', soft: '#ecfdf5' },
        expense: { DEFAULT: '#e11d48', soft: '#fff1f2' },
      },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px -6px rgba(15,23,42,.08)' },
    },
  },
  plugins: [],
};
