import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AO Semantic Tokens
        'surface-0': '#0F1F1B',
        'surface-1': '#161F1A',
        'surface-2': '#232B26',
        'surface-elevated': '#2C3630',
        'text-primary': '#F3F4F6',
        'text-secondary': '#B6BFC7',
        'text-muted': '#7A868C',
        'text-inverse': '#0F1F1B',
        'accent-primary': '#14B8A6',
        'accent-active': '#06B6D4',
        'accent-beacon': '#F59E42',
        'border-subtle': '#232B26',
        'border-strong': '#14B8A6',
        'status-available': '#14B8A6',
        'status-held': '#F59E42',
        'status-occupied': '#F43F5E',
        'status-cleaning': '#FBBF24',
        'status-out-of-service': '#7A868C',
        'info': '#06B6D4',
        'warning': '#F59E42',
        'critical': '#F43F5E',
        'success': '#22C55E',
        'exception-open': '#F43F5E',
        'exception-acknowledged': '#F59E42',
        'exception-resolved': '#14B8A6',
        // Legacy tokens for migration
        'ao-primary': '#14B8A6',
        'ao-teal': '#06B6D4',
        'ao-dark': '#0F1F1B',
        'ao-darker': '#06130E',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
