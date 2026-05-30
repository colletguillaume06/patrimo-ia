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
        /* ── Design system tokens ── */
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary:  'var(--bg-tertiary)',
          card:      'var(--bg-card)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover:   'var(--border-hover)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          disabled:  'var(--text-disabled)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          text:    'var(--accent-text)',
        },
        success: {
          bg:     'var(--success-bg)',
          border: 'var(--success-border)',
          text:   'var(--success-text)',
        },
        warning: {
          bg:     'var(--warning-bg)',
          border: 'var(--warning-border)',
          text:   'var(--warning-text)',
        },
        danger: {
          bg:     'var(--danger-bg)',
          border: 'var(--danger-border)',
          text:   'var(--danger-text)',
        },
        info: {
          bg:     'var(--info-bg)',
          border: 'var(--info-border)',
          text:   'var(--info-text)',
        },
        /* ── Rétrocompat ── */
        navy:  '#0B1628',
        navy2: '#111E35',
      },
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'sans-serif'],
        display: ['var(--font-syne)', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px', xl: '16px', '2xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
