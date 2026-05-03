import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'AO Sanctuary',
  description: 'Welcome to AO Sanctuary',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
  // Prevents the browser UI from showing when used as a fullscreen PWA on a kiosk tablet
  viewportFit: 'cover',
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
