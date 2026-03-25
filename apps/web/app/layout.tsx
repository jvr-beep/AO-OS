import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AO OS — Staff',
  description: 'AO OS internal staff portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
