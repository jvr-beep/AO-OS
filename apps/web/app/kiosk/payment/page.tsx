import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { KioskPaymentClient } from './KioskPaymentClient'

export default async function KioskPaymentPage() {
  const session = await getKioskSession()

  if (!session.guestId || !session.visitId || !session.clientSecret) {
    redirect('/kiosk')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Payment</p>
        </div>

        {/* Order summary */}
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary">{session.tierName}</p>
            <p className="text-sm font-medium text-text-primary">
              ${((session.amountCents ?? 0) / 100).toFixed(2)} CAD
            </p>
          </div>
        </div>

        {/* Stripe Elements payment form — rendered client-side */}
        <KioskPaymentClient
          clientSecret={session.clientSecret}
          visitId={session.visitId}
          amountCents={session.amountCents ?? 0}
        />

        <p className="text-center text-xs text-text-muted mt-6">
          Payments processed securely by Stripe. AO does not store card details.
        </p>
      </div>
    </div>
  )
}
