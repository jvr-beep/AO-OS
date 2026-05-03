import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'

import './globals.css'
import DatadogRum from '@/app/components/DatadogRum'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AO Sanctuary — Staff',
  description: 'AO Sanctuary internal operations portal',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'AO Sanctuary — Staff',
    description: 'AO Sanctuary internal operations portal',
    siteName: 'AO Sanctuary',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AO Sanctuary — Staff',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="antialiased bg-surface-0 min-h-screen">
        <DatadogRum />
        <main className="min-h-screen flex flex-col">{children}</main>
      </body>
    </html>
  )
}
