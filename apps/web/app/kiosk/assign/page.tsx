import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { assignWristbandAction, completeKioskAction } from '../actions/visit'
import { KioskErrorBanner } from '../components/KioskErrorBanner'

/**
 * Wristband assignment step.
 *
 * Staff places a wristband on the desk RFID reader (connected via USB HID / keyboard emulation)
 * — the UID auto-populates the hidden input and submits. Falls back to manual UID entry.
 */
export default async function AssignPage({
  searchParams,
}: {
  searchParams: { redirect_status?: string; payment_intent?: string; error?: string }
}) {
  const session = await getKioskSession()
  if (!session.visitId) redirect('/kiosk')

  if (searchParams.redirect_status && searchParams.redirect_status !== 'succeeded') {
    redirect('/kiosk/payment?error=Payment+not+completed')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">

        <div className="mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-2">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Wristband Activation</p>
        </div>

        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-accent-primary mb-8 animate-pulse">
          <span className="text-4xl text-accent-primary">⬡</span>
        </div>

        <h2 className="text-lg font-heading uppercase tracking-wider text-text-primary mb-3">
          Scan your wristband
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          Hold the wristband over the reader on the desk. It will activate automatically.
          {session.tierName && (
            <> Your <strong className="text-text-primary">{session.tierName}</strong> pass is ready.</>
          )}
        </p>

        {searchParams.error && <KioskErrorBanner message={decodeURIComponent(searchParams.error)} />}

        {/* Primary path — USB HID reader auto-submits this form */}
        <form action={assignWristbandAction} id="assign-form" className="mb-4">
          {/*
            USB RFID readers act as keyboard input — they type the UID and press Enter.
            This input is focused on load so the scan auto-submits.
            Staff can also type a UID manually if the reader isn't available.
          */}
          <input
            type="text"
            name="wristband_uid"
            autoFocus
            autoComplete="off"
            placeholder="Wristband UID (auto-filled by reader)"
            className="w-full text-center font-mono text-sm bg-surface-1 border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted mb-4 focus:outline-none focus:border-accent-primary"
          />
          <button
            type="submit"
            className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
          >
            Activate wristband
          </button>
        </form>

        {/* Fallback — offline or manual override */}
        <form action={completeKioskAction} className="mt-2">
          <button
            type="submit"
            className="w-full text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors py-2 border border-border-subtle rounded-lg"
          >
            Skip — wristband issued at front desk
          </button>
        </form>

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-4 mt-8 text-left">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Visit</p>
          <p className="font-mono text-xs text-text-primary tracking-wider break-all">{session.visitId}</p>
        </div>
      </div>
    </div>
  )
}
