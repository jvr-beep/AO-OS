'use client'

import { useEffect, useRef } from 'react'

interface MembershipCardProps {
  memberNumber: string
  memberId: string
  tierLabel: string | null
  subscriptionStatus: string | null
}

// Status → pill color
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success text-surface-0',
  trialing: 'bg-info text-surface-0',
  past_due: 'bg-warning text-surface-0',
  paused: 'bg-text-muted text-surface-0',
  cancelled: 'bg-critical text-surface-0',
}

export function MembershipCard({ memberNumber, memberId, tierLabel, subscriptionStatus }: MembershipCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate QR code via canvas — encodes the member ID for RFID/kiosk lookup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Dynamic import to avoid SSR issues
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toCanvas(canvas, memberId, {
        width: 140,
        margin: 1,
        color: {
          dark: '#EDE9E3', // Warm Ivory
          light: '#0F1620', // surface-1
        },
      })
    }).catch(() => {
      // qrcode not installed — show fallback text
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = 140
        canvas.height = 140
        ctx.fillStyle = '#1C222B'
        ctx.fillRect(0, 0, 140, 140)
        ctx.fillStyle = '#EDE9E3'
        ctx.font = '10px monospace'
        ctx.fillText('QR unavailable', 10, 70)
      }
    })
  }, [memberId])

  const statusStyle = subscriptionStatus ? (STATUS_STYLES[subscriptionStatus] ?? 'bg-surface-2 text-text-muted') : 'bg-surface-2 text-text-muted'

  return (
    <div className="rounded-xl bg-surface-1 border border-border-strong p-6 relative overflow-hidden">
      {/* Subtle teal accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-accent-primary opacity-60" />

      <div className="flex items-start justify-between gap-4">
        {/* Card info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-heading tracking-widest text-text-primary">ΑΩ</span>
            {tierLabel && (
              <span className="text-xs text-text-muted uppercase tracking-wider border border-border-subtle px-2 py-0.5 rounded">
                {tierLabel}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Member</p>
              <p className="font-mono text-sm text-text-primary tracking-wider truncate">{memberNumber}</p>
            </div>

            {subscriptionStatus && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Status</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${statusStyle}`}>
                  {subscriptionStatus}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* QR code */}
        <div className="flex-shrink-0">
          <div className="p-2 bg-surface-1 rounded-lg border border-border-subtle">
            <canvas
              ref={canvasRef}
              width={140}
              height={140}
              className="block"
              title={`Member ID: ${memberId}`}
            />
          </div>
          <p className="text-center text-xs text-text-muted mt-1.5 uppercase tracking-wider">Scan to enter</p>
        </div>
      </div>
    </div>
  )
}
