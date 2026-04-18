import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { ActiveKioskDisplay } from './ActiveKioskDisplay'
import { RitualCoach } from './RitualCoach'
import { resetKioskAction } from '../actions/visit'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

async function getVisit(visitId: string) {
  try {
    const res = await fetch(`${API_BASE}/visits/${visitId}`, {
      headers: { 'X-AO-Location': LOCATION_CODE },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Zone descriptions for the active visit map
const ZONE_GUIDE = [
  { name: 'Alpha Zone', description: 'Entrance, showers, warm baths, cleansing ritual.', icon: 'Α' },
  { name: 'Brotherhood Hall', description: 'Social lounge, rest, community.', icon: '⊕' },
  { name: 'Caldarium', description: 'Hot thermal bath — begin your circuit here.', icon: '◉' },
  { name: 'Thermarium', description: 'Warm intermediate thermal.', icon: '◎' },
  { name: 'Frigidarium', description: 'Cold plunge — the ritual contrast.', icon: '◌' },
]

export default async function ActiveVisitPage() {
  const session = await getKioskSession()
  if (!session.visitId || !session.wristbandAssigned) redirect('/kiosk')

  const visit = await getVisit(session.visitId)

  // Compute visit progress for ritual coach phase inference
  const durationMinutes = visit?.duration_minutes ?? 120
  const startTime = visit?.start_time ? new Date(visit.start_time) : null
  const elapsedMinutes = startTime ? (Date.now() - startTime.getTime()) / 60000 : 0
  const progressFraction = Math.min(1, Math.max(0, elapsedMinutes / durationMinutes))

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Your Visit is Active</p>
        </div>

        {/* Live timer */}
        <ActiveKioskDisplay
          visitId={session.visitId}
          tierName={session.tierName ?? ''}
          scheduledEndTime={visit?.scheduled_end_time ?? null}
          durationMinutes={visit?.duration_minutes ?? 120}
        />

        {/* Zone guide */}
        <div className="mt-6 rounded-lg bg-surface-1 border border-border-subtle p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Your Spaces</p>
          <div className="space-y-3">
            {ZONE_GUIDE.map((zone) => (
              <div key={zone.name} className="flex items-start gap-3">
                <span className="text-accent-primary text-sm font-heading w-6 flex-shrink-0">{zone.icon}</span>
                <div>
                  <p className="text-xs font-medium text-text-primary">{zone.name}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{zone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ritual Coach — Lane 2 voice guidance */}
        <RitualCoach
          visitMode={session.visitMode ?? 'restore'}
          progressFraction={progressFraction}
        />

        {/* Discreet navigation guidance */}
        <div className="mt-4 rounded-lg bg-surface-1 border border-border-subtle p-4 text-center">
          <p className="text-xs text-text-muted leading-relaxed">
            Follow the teal markers. Your wristband opens all spaces included in your pass.
            If you need assistance, approach the front desk.
          </p>
        </div>

        <form action={resetKioskAction} className="mt-6">
          <button
            type="submit"
            className="w-full text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors py-2"
          >
            Start new visit
          </button>
        </form>
      </div>
    </div>
  )
}
