import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { selectTierAction } from '../actions/visit'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

interface TierOption {
  id: string
  code: string
  name: string
  description: string | null
  basePriceCents: number
  durationOptions: { id: string; durationMinutes: number; priceCents: number }[]
}

async function getTiers(): Promise<TierOption[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog/tiers?active=true`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.tiers ?? data ?? []
  } catch {
    return []
  }
}

// Mode description copy
const MODE_COPY: Record<string, { label: string; description: string; icon: string }> = {
  restore: {
    label: 'Restore',
    description: 'Thermal circuit, bathing, reset. A pause from the world.',
    icon: '◯',
  },
  release: {
    label: 'Release',
    description: 'Private space, erotic self-care, embodied permission.',
    icon: '◈',
  },
  retreat: {
    label: 'Retreat',
    description: 'Extended, immersive, premium privacy. Deeper ritual.',
    icon: '◇',
  },
}

// Map tier code → suggested visit mode
const TIER_MODE_MAP: Record<string, string> = {
  HOUSE_PASS: 'restore',
  PRIVATE_PASS: 'release',
  RETREAT_PASS: 'retreat',
  TRAVEL_PASS: 'retreat',
}

export default async function SelectPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getKioskSession()
  if (!session.guestId || !session.waiverCompleted) redirect('/kiosk')

  const tiers = await getTiers()

  // Filter to kiosk-relevant tiers (one-time passes only, not credit packs or subscriptions)
  const kioskTiers = tiers.filter((t) =>
    ['HOUSE_PASS', 'PRIVATE_PASS', 'RETREAT_PASS', 'TRAVEL_PASS'].includes(t.code)
  )

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Choose Your Visit</p>
        </div>

        {/* Visit mode selector */}
        <div className="mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3">What brings you in today?</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(MODE_COPY).map(([mode, copy]) => (
              <label
                key={mode}
                className="cursor-pointer"
              >
                <input type="radio" name="visitMode" value={mode} className="sr-only peer" defaultChecked={mode === 'restore'} form="select-form" />
                <div className="rounded-lg bg-surface-1 border border-border-subtle p-3 text-center peer-checked:border-accent-primary transition-colors">
                  <p className="text-lg text-accent-primary mb-1">{copy.icon}</p>
                  <p className="text-xs font-medium text-text-primary uppercase tracking-wider">{copy.label}</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed hidden md:block">{copy.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Tier options */}
        <div className="space-y-3 mb-6">
          {kioskTiers.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-8">No passes available. Please speak with staff.</p>
          ) : (
            kioskTiers.map((tier) => {
              const defaultDuration = tier.durationOptions?.[0]
              const price = defaultDuration?.priceCents ?? tier.basePriceCents
              const duration = defaultDuration?.durationMinutes ?? 120
              const mode = TIER_MODE_MAP[tier.code] ?? 'restore'
              const modeCopy = MODE_COPY[mode]

              return (
                <form key={tier.id} id="select-form" action={selectTierAction}>
                  <input type="hidden" name="tierCode" value={tier.code} />
                  <input type="hidden" name="tierName" value={tier.name} />
                  <input type="hidden" name="tierId" value={tier.id} />
                  <input type="hidden" name="durationMinutes" value={duration} />
                  <input type="hidden" name="amountCents" value={price} />
                  <input type="hidden" name="visitMode" value={mode} />

                  <button
                    type="submit"
                    className="w-full text-left rounded-lg bg-surface-1 border border-border-subtle hover:border-accent-primary transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">{tier.name}</span>
                          <span className="text-xs text-accent-primary">{modeCopy?.icon}</span>
                        </div>
                        <p className="text-xs text-text-muted">{tier.description ?? modeCopy?.description}</p>
                        <p className="text-xs text-text-secondary mt-1">{duration} minutes</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-text-primary">
                          ${(price / 100).toFixed(0)}
                        </p>
                        <p className="text-xs text-text-muted">CAD</p>
                      </div>
                    </div>
                  </button>
                </form>
              )
            })
          )}
        </div>

        {searchParams.error && (
          <p className="text-critical text-xs text-center mb-4">{searchParams.error}</p>
        )}

        <a href="/kiosk" className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors">
          Start Over
        </a>
      </div>
    </div>
  )
}
