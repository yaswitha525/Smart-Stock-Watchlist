/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0b',
          card: 'rgba(25, 25, 28, 0.7)',
          hover: 'rgba(35, 35, 40, 0.8)',
          border: 'rgba(255, 255, 255, 0.08)',
          muted: '#9ca3af',
        },
        brand: {
          emerald: '#10b981',
          red: '#ef4444',
          amber: '#f59e0b',
          accent: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
