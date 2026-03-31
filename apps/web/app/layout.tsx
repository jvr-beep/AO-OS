import type { Metadata } from 'next'

import './globals.css'
import { AoLogo } from '@/components/AoLogo'

export const metadata: Metadata = {
  title: 'AO OS — Staff',
  description: 'AO OS internal staff portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-surface-0 via-surface-1 to-surface-2 min-h-screen relative">
        {/* AO Logo watermark, fixed and subtle */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 select-none opacity-10">
          <AoLogo className="w-[40vw] h-[40vw] max-w-[600px] max-h-[600px]" />
        </div>
        {/* Main content overlays the background/logo */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="w-full flex items-center justify-center py-6">
            <AoLogo className="w-12 h-12" />
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  )
}
