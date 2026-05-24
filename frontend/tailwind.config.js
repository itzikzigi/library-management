/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary: emerald → teal scholar
        ink: {
          50: '#effaf5',
          100: '#d7f2e6',
          200: '#aee5cf',
          300: '#7bd1b1',
          400: '#46b78f',
          500: '#1f9a72',
          600: '#127a5b',
          700: '#0e604a',
          800: '#0d4d3e',
          900: '#0a3a2f',
          950: '#04221b',
        },
        // Background: warm peach-cream
        parchment: {
          50: '#fef8ee',
          100: '#fcecd2',
          200: '#fad6a0',
          300: '#f6b966',
          400: '#f29a38',
        },
        // Saffron / marigold accent
        amber: {
          DEFAULT: '#f0a830',
          dark: '#b96a05',
        },
        // Berry / plum for highlights & special features
        berry: {
          DEFAULT: '#d6336c',
          dark: '#a01650',
        },
        // Coral for warm danger / overdue energy
        coral: {
          DEFAULT: '#ef5350',
          dark: '#b71c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        display: ['Fraunces', '"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13, 77, 62, 0.05), 0 6px 18px rgba(13, 77, 62, 0.08)',
        book: '0 8px 24px rgba(10, 58, 47, 0.25), inset -2px 0 0 rgba(0,0,0,0.12)',
        glow: '0 0 0 4px rgba(240, 168, 48, 0.18)',
      },
      backgroundImage: {
        'sunrise':
          'radial-gradient(circle at 20% 0%, #fde0a8 0%, transparent 45%), radial-gradient(circle at 100% 100%, #aee5cf 0%, transparent 50%), linear-gradient(180deg, #fef8ee 0%, #fef8ee 100%)',
      },
    },
  },
  plugins: [],
}
