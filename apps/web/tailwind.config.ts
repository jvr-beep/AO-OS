import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AO Canonical Brand Tokens
        'surface-0': '#0B0E11',        // Obsidian — primary background
        'surface-1': '#0F1620',        // Deep Navy Stone — alternate background
        'surface-2': '#1C222B',        // Bronzed Charcoal — cards, separation layers
        'surface-elevated': '#1C222B', // same as surface-2
        'text-primary': '#EDE9E3',     // Warm Ivory
        'text-secondary': '#9CA3AF',   // Stone Grey
        'text-muted': '#6B7280',
        'text-inverse': '#0B0E11',
        'accent-primary': '#2F8F83',   // AO Metallic / Electrum Teal — use sparingly
        'border-subtle': '#1C222B',
        'border-strong': '#2F8F83',
        // Functional status colors — operational UI only
        'status-available': '#2F8F83',
        'status-held': '#F59E42',
        'status-occupied': '#F43F5E',
        'status-cleaning': '#FBBF24',
        'status-out-of-service': '#6B7280',
        'info': '#2F8F83',
        'warning': '#F59E42',
        'critical': '#F43F5E',
        'success': '#22C55E',
        'exception-open': '#F43F5E',
        'exception-acknowledged': '#F59E42',
        'exception-resolved': '#2F8F83',
        // Legacy aliases — all resolve to canonical brand tokens
        'ao-primary': '#2F8F83',
        'ao-teal': '#2F8F83',    // was #06B6D4 (off-brand cyan), now canonical teal
        'ao-dark': '#0B0E11',
        'ao-darker': '#070A0D',
        'accent-active': '#2F8F83', // was #06B6D4, aliased to accent-primary
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
