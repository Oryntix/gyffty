import type { Config } from 'tailwindcss';

/**
 * The Gyffty design system.
 *
 * Taken off the brand seal: warm charcoal (`noir`) carries the brand, antique
 * gold (`gold`) is the accent reserved for premium signals and rules, and a warm
 * bone background keeps the storefront off pure white so the gold reads richer.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Warm charcoal, sampled from the seal's textured plate.
        noir: {
          50: '#F7F6F4',
          100: '#ECEAE6',
          200: '#D7D3CC',
          300: '#B3ADA4',
          400: '#878076',
          500: '#625C53',
          600: '#47423B',
          700: '#332F2A',
          800: '#252220',
          900: '#1A1816',
          950: '#0D0C0B',
        },
        // Metallic gold foil, sampled off the seal: shadow through to highlight.
        gold: {
          50: '#FDF9F0',
          100: '#F8EFD8',
          200: '#F0DFB0',
          300: '#E5C983',
          400: '#D9B463',
          500: '#C9A24E',
          600: '#AC863C',
          700: '#8B6A30',
          800: '#6E5429',
          900: '#5A4523',
        },
        blush: {
          50: '#FDF7F5',
          100: '#FAEDE8',
          200: '#F4D9D0',
          300: '#E9BAAB',
          400: '#D89080',
          500: '#C4705F',
        },
        bone: '#FAF8F4',
        ink: '#1C1B19',
        muted: '#6E6860',
        line: '#E7E2D9',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2rem, 4.5vw, 3.25rem)', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.22em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,27,25,0.04), 0 8px 24px -12px rgba(28,27,25,0.18)',
        lift: '0 12px 40px -16px rgba(28,27,25,0.45)',
        rail: '0 -1px 0 rgba(231,226,217,1)',
      },
      backgroundImage: {
        // The same ramp the seal's foil uses, for headings and rules.
        foil: 'linear-gradient(115deg, #F3E0A8 0%, #D9B463 26%, #C9A24E 50%, #F0E1AE 68%, #9C7A33 100%)',
        'foil-rule': 'linear-gradient(90deg, #C9A24E 0%, #F0E1AE 45%, transparent 100%)',
      },
      borderRadius: { card: '14px', pill: '999px' },
      transitionTimingFunction: { silk: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 26s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
