import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { completeKioskAction } from '../actions/visit'

/**
 * Wristband assignment confirmation step.
 * Staff scans the wristband at the front desk — this screen guides the guest.
 * Once assigned, the guest taps "I have my wristband" to reach the active visit screen.
 */
export default async function AssignPage() {
  const session = await getKioskSession()
  if (!session.visitId) redirect('/kiosk')

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">

        <div className="mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-2">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Wristband Assignment</p>
        </div>

        {/* Wristband icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-accent-primary mb-8">
          <span className="text-4xl text-accent-primary">⬡</span>
        </div>

        <h2 className="text-lg font-heading uppercase tracking-wider text-text-primary mb-3">
          Payment Confirmed
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          Please approach the front desk to receive your wristband.
          Your RFID credential will be activated and linked to your visit.
        </p>

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-4 mb-8 text-left">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Visit ID</p>
          <p className="font-mono text-xs text-text-primary tracking-wider break-all">{session.visitId}</p>
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
