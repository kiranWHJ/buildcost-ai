/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
      },
      colors: {
        // "Site office" palette: slate ink, poured-concrete greys, rebar teal, brass for money
        ink: { DEFAULT: '#16222c', soft: '#3d4b56', mute: '#6b7780' },
        concrete: { 50: '#f6f7f6', 100: '#eceeec', 200: '#dde1de', 300: '#c6ccc8' },
        rebar: { DEFAULT: '#0e6b66', dark: '#0a4f4b', light: '#d7ebe9' },
        brass: { DEFAULT: '#a87a2c', light: '#f3ead8', dark: '#7d5a1f' },
        series: { construction: '#2a78d6', electrical: '#eb6834', aqua: '#1baf7a', yellow: '#eda100' },
        status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
      },
      boxShadow: {
        sheet: '0 1px 0 rgba(22,34,44,0.06), 0 8px 24px -12px rgba(22,34,44,0.18)',
      },
    },
  },
  plugins: [],
};
