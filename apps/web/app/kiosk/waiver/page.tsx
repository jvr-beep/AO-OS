import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { acceptWaiverAction } from '../actions/visit'
import { KioskErrorBanner } from '../components/KioskErrorBanner'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

const WAIVER_TEXT = `
ALPHA OMEGA (ΑΩ) SANCTUARY — HOUSE RULES & WAIVER OF LIABILITY

By entering AO Sanctuary, you acknowledge and agree to the following:

1. CONDUCT
All guests are expected to conduct themselves with respect for the house, its members, and their boundaries. Consent is non-negotiable. Any conduct that violates the dignity of another person will result in immediate removal and permanent ban.

2. HEALTH & SAFETY
You confirm that you are in good health and not aware of any condition that would put yourself or others at risk. AO Sanctuary is an adult wellness environment. You accept responsibility for your own physical safety and wellbeing during your visit.

3. PREMISES & PERSONAL PROPERTY
AO Sanctuary is not responsible for loss, theft, or damage to personal property. Lockers are provided as a courtesy and do not constitute a bailment.

4. PHOTOGRAPHY
No photography or recording of any kind is permitted inside AO Sanctuary premises. Violation of this policy will result in immediate removal and permanent ban.

5. DISCRETION
What occurs within AO Sanctuary is private. Members and guests are expected to maintain discretion regarding the identity and activities of others they may encounter on premises.

6. LIMITATION OF LIABILITY
You release AO Sanctuary, its employees, agents, and affiliates from any and all claims arising from your visit, including but not limited to personal injury, property damage, or any other harm.

By signing below, you confirm that you have read, understood, and agree to these terms.
`.trim()

async function checkWaiverStatus(guestId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/guests/${guestId}/waivers/latest`, {
      cache: 'no-store',
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.isValid === true
  } catch {
    return false
  }
}

export default async function WaiverPage({
  searchParams,
}: {
  searchParams: { error?: string; forceNew?: string }
}) {
  const session = await getKioskSession()
  if (!session.guestId) redirect('/kiosk')

  const waiverCurrent = searchParams.forceNew !== '1' && await checkWaiverStatus(session.guestId)

  if (waiverCurrent) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
            <p className="text-xs text-text-muted uppercase tracking-widest">Welcome Back</p>
          </div>

          <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 mb-6 text-center space-y-3">
            <p className="text-sm text-text-primary font-medium">You have an active waiver on file.</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Our house rules and waiver of liability remain unchanged since your last visit.
              By continuing, you confirm that you have reviewed and still agree to all terms.
            </p>
          </div>

          {searchParams.error && <KioskErrorBanner message={searchParams.error} />}

          <form action={acceptWaiverAction}>
            <input type="hidden" name="reconfirm" value="true" />
            <button
              type="submit"
              className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
            >
              I Confirm — Continue
            </button>
          </form>

          <a
            href="/kiosk/waiver?forceNew=1"
            className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors mt-4"
          >
            Review Full Waiver
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">House Rules &amp; Waiver</p>
        </div>

        {/* Waiver text */}
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-5 mb-6 max-h-64 overflow-y-auto">
          <pre className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
            {WAIVER_TEXT}
          </pre>
        </div>

        <form action={acceptWaiverAction} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
              Type your full name to sign
            </label>
            <input
              name="signature"
              type="text"
              required
              placeholder="Your full name"
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          {searchParams.error && <KioskErrorBanner message={searchParams.error} />}

          <button
            type="submit"
            className="w-full btn-primary py-4 text-sm uppercase tracking-widest"
          >
            I Agree — Continue
          </button>
        </form>
      </div>
    </div>
  )
}
