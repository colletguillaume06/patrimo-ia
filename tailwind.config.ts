import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1628',
        navy2: '#111E35',
        blue: { DEFAULT: '#1A56DB', 600: '#1A56DB' },
        cyan: { DEFAULT: '#06B6D4' },
        green: { DEFAULT: '#10B981' },
        amber: { DEFAULT: '#F59E0B' },
        red: { DEFAULT: '#EF4444' },
        slate: {
          DEFAULT: '#8B9AB3',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
        },
        border: 'rgba(255,255,255,0.08)',
        glass: 'rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        display: ['var(--font-syne)', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
