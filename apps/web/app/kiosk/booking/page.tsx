import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { lookupBookingAction } from '../actions/visit'

export default async function KioskBookingLookupPage({
  searchParams,
}: {
  searchParams: { error?: string; tab?: string }
}) {
  // Reset any prior booking state if coming fresh
  const session = await getKioskSession()
  if (session.visitId) redirect('/kiosk/active')

  const tab = searchParams.tab === 'phone' ? 'phone' : 'code'

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Find Your Booking</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-border-subtle mb-6">
          <a
            href="/kiosk/booking?tab=code"
            className={`flex-1 py-3 text-xs uppercase tracking-wider text-center transition-colors ${
              tab === 'code'
                ? 'bg-accent-primary text-surface-0 font-semibold'
                : 'bg-surface-1 text-text-muted hover:text-text-primary'
            }`}
          >
            Booking Code
          </a>
          <a
            href="/kiosk/booking?tab=phone"
            className={`flex-1 py-3 text-xs uppercase tracking-wider text-center transition-colors ${
              tab === 'phone'
                ? 'bg-accent-primary text-surface-0 font-semibold'
                : 'bg-surface-1 text-text-muted hover:text-text-primary'
            }`}
          >
            Phone Number
          </a>
        </div>

        <form action={lookupBookingAction} className="space-y-4">
          <input type="hidden" name="lookup_type" value={tab} />

          {tab === 'code' ? (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Booking Code
              </label>
              <input
                name="value"
                type="text"
                required
                autoFocus
                placeholder="AO-XXXXXXXX"
                className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors uppercase tracking-widest"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Found in your booking confirmation email
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                name="value"
                type="tel"
                required
                autoFocus
                placeholder="+1 (416) 555-0100"
                className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Phone number used when booking
              </p>
            </div>
          )}

          {searchParams.error && (
            <p className="text-critical text-xs text-center">{searchParams.error}</p>
          )}

          <button
            type="submit"
            className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
          >
            Find Booking
          </button>
        </form>

        <a
          href="/kiosk"
          className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors mt-6"
        >
          Back
        </a>
      </div>
    </div>
  )
}
