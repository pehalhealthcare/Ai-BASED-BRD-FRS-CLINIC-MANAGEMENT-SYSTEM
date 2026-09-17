/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      colors: {
        aura: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        indigo: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        navy: {
          900: '#0a0f1a',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        }
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-blue': '0 0 24px rgba(37,99,235,0.3)',
        'glow-indigo': '0 0 24px rgba(99,102,241,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.06)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'elevated': '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 32px -4px rgba(0,0,0,0.10)',
        'elevated-dark': '0 4px 6px -1px rgba(0,0,0,0.5), 0 12px 32px -4px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2563EB, #1D4ED8)',
        'gradient-brand-dark': 'linear-gradient(135deg, #3B82F6, #2563EB)',
        'grid-light': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 1.4s ease-in-out infinite',
        'typing': 'typing 1.2s steps(3, end) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(37,99,235,0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(37,99,235,0.5)' },
        },
        bounceSubtle: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        typing: {
          '0%': { width: '4px' },
          '33%': { width: '12px' },
          '66%': { width: '20px' },
          '100%': { width: '4px' },
        }
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
