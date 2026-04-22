import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { confirmBookingCheckinAction } from '../../actions/visit'
import { KioskErrorBanner } from '../../components/KioskErrorBanner'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })
}

export default async function BookingConfirmPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getKioskSession()
  if (!session.bookingId || !session.bookingData) redirect('/kiosk/booking')

  const b = session.bookingData
  const needsWaiver = !session.waiverCompleted

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Booking Found</p>
        </div>

        {/* Booking summary card */}
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 mb-6 space-y-4">
          <div className="text-center pb-4 border-b border-border-subtle">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Booking Reference</p>
            <p className="text-2xl font-mono font-semibold text-accent-primary tracking-widest">
              {b.bookingCode}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Pass" value={b.tierName ?? '—'} />
            <Row label="Type" value={b.productType === 'room' ? 'Private Room' : 'Locker'} />
            <Row label="Date" value={formatDate(b.arrivalWindowStart)} />
            <Row
              label="Arrival Window"
              value={`${formatTime(b.arrivalWindowStart)} – ${formatTime(b.arrivalWindowEnd)}`}
            />
            <Row label="Duration" value={`${b.durationMinutes} min`} />
          </div>

          {b.balanceDueCents > 0 ? (
            <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-text-muted uppercase tracking-wider">Balance Due</span>
              <span className="text-lg font-semibold text-text-primary">
                ${(b.balanceDueCents / 100).toFixed(2)} CAD
              </span>
            </div>
          ) : (
            <div className="pt-4 border-t border-border-subtle text-center">
              <span className="text-xs text-success uppercase tracking-wider font-semibold">Paid in Full</span>
            </div>
          )}
        </div>

        {needsWaiver && (
          <div className="rounded-lg border border-yellow-600 bg-yellow-950 px-4 py-3 mb-4 text-sm text-yellow-200">
            <p className="font-semibold mb-0.5">Waiver required</p>
            <p className="text-xs opacity-80">Please review and sign the house rules before checking in.</p>
          </div>
        )}

        {searchParams.error && <KioskErrorBanner message={searchParams.error} />}

        {needsWaiver ? (
          <a
            href="/kiosk/waiver"
            className="block w-full btn-primary py-4 text-sm uppercase tracking-widest text-center"
          >
            Review &amp; Sign Waiver
          </a>
        ) : (
          <form action={confirmBookingCheckinAction}>
            <button
              type="submit"
              className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
            >
              {b.balanceDueCents > 0 ? 'Continue to Payment' : 'Check In'}
            </button>
          </form>
        )}

        <a
          href="/kiosk/booking"
          className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors mt-4"
        >
          Not You? Search Again
        </a>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-muted text-xs uppercase tracking-wider">{label}</span>
      <span className="text-text-primary font-medium text-right">{value}</span>
    </div>
  )
}
