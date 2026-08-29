/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        none: '0',
        xs: '2px',
        sm: '3px',
        DEFAULT: '4px',
        md: '4px',
        lg: '5px',
        xl: '6px',
        '2xl': '6px',
        '3xl': '8px',
        full: '9999px',
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#0f172a',
        },
        emergency: {
          normal: '#10b981',
          advisory: '#3b82f6',
          warning: '#f59e0b',
          evacuate: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
