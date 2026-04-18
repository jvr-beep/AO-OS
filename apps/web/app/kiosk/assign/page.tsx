import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { completeKioskAction } from '../actions/visit'

/**
 * Wristband assignment confirmation step.
 * Reached two ways:
 *  1. After Stripe payment — redirect_status=succeeded in query params
 *  2. Offline mode — no Stripe, payment handled at front desk
 *
 * Staff scans the wristband at the front desk — this screen guides the guest.
 * Once assigned, the guest taps "I have my wristband" to reach the active visit screen.
 */
export default async function AssignPage({
  searchParams,
}: {
  searchParams: { redirect_status?: string; payment_intent?: string }
}) {
  const session = await getKioskSession()
  if (!session.visitId) redirect('/kiosk')

  // If Stripe redirected here, verify payment succeeded
  if (searchParams.redirect_status && searchParams.redirect_status !== 'succeeded') {
    redirect('/kiosk/payment?error=Payment+not+completed')
  }

  const isOffline = !session.clientSecret
  const paymentLabel = isOffline ? 'Pay at the front desk' : 'Payment confirmed'
  const paymentSub = isOffline
    ? 'The front desk will collect payment and issue your wristband.'
    : 'Your payment was processed. Please approach the front desk to receive your wristband.'

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">

        <div className="mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-2">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Wristband Assignment</p>
        </div>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-accent-primary mb-8">
          <span className="text-4xl text-accent-primary">⬡</span>
        </div>

        <h2 className="text-lg font-heading uppercase tracking-wider text-text-primary mb-3">
          {paymentLabel}
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          {paymentSub}
          {' '}Your RFID credential will be activated and linked to your visit.
        </p>

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-4 mb-8 text-left">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Visit ID</p>
          <p className="font-mono text-xs text-text-primary tracking-wider break-all">{session.visitId}</p>
          {session.tierName && (
            <>
              <p className="text-xs text-text-muted uppercase tracking-wider mt-3 mb-1">Pass</p>
              <p className="text-xs text-text-primary">{session.tierName}</p>
            </>
          )}
        </div>

        <form action={completeKioskAction}>
          <button
            type="submit"
            className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
          >
            I have my wristband — Enter
          </button>
        </form>
      </div>
    </div>
  )
}
