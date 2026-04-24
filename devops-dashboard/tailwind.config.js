export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        base: {
          950: '#0a0c0f',
          900: '#0f1117',
          800: '#161b24',
          700: '#1e2535',
          600: '#252e42',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          glow: 'rgba(34, 211, 238, 0.15)',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          glow: 'rgba(251, 191, 36, 0.15)',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
          glow: 'rgba(251, 113, 133, 0.15)',
        },
        emerald: {
          400: '#34d399',
          glow: 'rgba(52, 211, 153, 0.15)',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
      }
    },
  },
  plugins: [],
}
