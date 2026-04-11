import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import { GlobalErrorHandler } from '@/components/global-error-handler'

import './globals.css'

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
  title: 'AO OS — Staff',
  description: 'AO OS internal staff portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="antialiased bg-surface-0 min-h-screen">
        <GlobalErrorHandler />
        <main className="min-h-screen flex flex-col">{children}</main>
      </body>
    </html>
  )
}
