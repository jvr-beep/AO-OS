import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { selectRoomAction } from '../actions/visit'
import { KioskErrorBanner } from '../components/KioskErrorBanner'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

interface AvailableResource {
  id: string
  displayLabel: string
  resourceType: string
  zoneCode: string
  floorSection: string | null
  isDiscrete: boolean
  maxOccupancy: number | null
  description: string | null
  features: string[]
  tierId: string
  tierName: string
  tierCode: string
  status: string
}

interface GuestPreferences {
  preferDiscrete?: boolean
  preferredFloorSection?: string | null
  preferredFeatures?: string[]
}

async function fetchAvailableResources(
  productType: string,
  tierId: string,
): Promise<AvailableResource[]> {
  try {
    const url = `${API_BASE}/kiosk/available-resources?product_type=${productType}&tier_id=${tierId}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '' },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function scoreResource(resource: AvailableResource, prefs: GuestPreferences): number {
  let score = 0
  if (prefs.preferDiscrete && resource.isDiscrete) score += 10
  if (prefs.preferredFloorSection && resource.floorSection === prefs.preferredFloorSection) score += 5
  if (prefs.preferredFeatures?.length) {
    const matches = prefs.preferredFeatures.filter((f) => resource.features.includes(f))
    score += matches.length * 3
  }
  return score
}

export default async function SelectRoomPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getKioskSession()
  if (!session.guestId || !session.waiverCompleted) redirect('/kiosk')
  if (!session.visitId || !session.tierId || !session.productType) redirect('/kiosk/product')

  const resources = await fetchAvailableResources(session.productType, session.tierId)

  const prefs: GuestPreferences = (session.guestPreferences as GuestPreferences) ?? {}

  // Sort by preference score descending, then by label
  const scored = resources
    .map((r) => ({ resource: r, score: scoreResource(r, prefs) }))
    .sort((a, b) => b.score - a.score || a.resource.displayLabel.localeCompare(b.resource.displayLabel))

  const topResourceId = scored[0]?.resource.id ?? null

  const isRoom = session.productType === 'room'
  const typeLabel = isRoom ? 'Room' : 'Locker'

  // Group by floor section for display
  const sections = new Map<string, AvailableResource[]>()
  for (const { resource } of scored) {
    const key = resource.floorSection ?? 'Main Floor'
    if (!sections.has(key)) sections.set(key, [])
    sections.get(key)!.push(resource)
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Choose Your {typeLabel}</p>
        </div>

        {resources.length === 0 ? (
          <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 text-center">
            <p className="text-sm text-text-muted mb-4">No {typeLabel.toLowerCase()}s are available right now.</p>
            <p className="text-xs text-text-muted">Please speak with staff for assistance.</p>
          </div>
        ) : (
          <>
            {prefs.preferDiscrete || prefs.preferredFloorSection ? (
              <p className="text-xs text-text-muted mb-4 text-center">
                ✦ Highlighted based on your preferences
              </p>
            ) : null}

            {Array.from(sections.entries()).map(([section, sectionResources]) => (
              <div key={section} className="mb-6">
                {sections.size > 1 && (
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{section}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {sectionResources.map((resource) => {
                    const isRecommended = resource.id === topResourceId && scoreResource(resource, prefs) > 0

                    return (
                      <form key={resource.id} action={selectRoomAction}>
                        <input type="hidden" name="resourceId" value={resource.id} />
                        <input type="hidden" name="resourceLabel" value={resource.displayLabel} />
                        <input type="hidden" name="floorSection" value={resource.floorSection ?? ''} />
                        <button
                          type="submit"
                          className={`w-full text-left rounded-lg border p-4 transition-colors ${
                            isRecommended
                              ? 'bg-surface-2 border-accent-primary'
                              : 'bg-surface-1 border-border-subtle hover:border-accent-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-text-primary leading-tight">
                              {resource.displayLabel}
                            </p>
                            {isRecommended && (
                              <span className="text-xs bg-accent-primary text-surface-0 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                                For You
                              </span>
                            )}
                            {resource.isDiscrete && (
                              <span className="text-xs bg-surface-0 text-text-muted px-1.5 py-0.5 rounded border border-border-subtle flex-shrink-0">
                                Private
                              </span>
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-xs text-text-muted leading-relaxed mb-2">{resource.description}</p>
                          )}
                          {resource.features.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.features.slice(0, 3).map((f) => (
                                <span key={f} className="text-xs bg-surface-0 text-text-muted px-1.5 py-0.5 rounded">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                          {resource.maxOccupancy && resource.maxOccupancy > 1 && (
                            <p className="text-xs text-text-muted mt-1">Up to {resource.maxOccupancy} guests</p>
                          )}
                        </button>
                      </form>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Let AO Choose — auto-selects the top recommended resource */}
            <form action={selectRoomAction} className="mt-2">
              <input type="hidden" name="resourceId" value={topResourceId ?? ''} />
              <input
                type="hidden"
                name="resourceLabel"
                value={scored[0]?.resource.displayLabel ?? ''}
              />
              <input
                type="hidden"
                name="floorSection"
                value={scored[0]?.resource.floorSection ?? ''}
              />
              <button
                type="submit"
                className="w-full text-center text-xs text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors py-3 border border-border-subtle rounded-lg"
              >
                Let AO Choose
              </button>
            </form>
          </>
        )}

        {searchParams.error && (
          <div className="mt-4">
            <KioskErrorBanner message={searchParams.error} />
          </div>
        )}

        <a
          href="/kiosk/select"
          className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors mt-4"
        >
          ← Change Pass
        </a>
      </div>
    </div>
  )
}
