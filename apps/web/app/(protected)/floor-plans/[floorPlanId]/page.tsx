import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { LiveFacilityFloorExplorer } from '@/components/live-facility-floor-explorer'
import { StatusBadge } from '@/components/status-badge'
import { buildFacilityFloorMap, mapFacilityFloorApiToViewModel, type FacilityFloorMap } from '@/lib/facility-floor-map'
import type { FacilityFloorMapResponse, FloorPlan, Room } from '@/types/api'

export default async function FloorPlanDetailPage({
  params,
}: {
  params: { floorPlanId: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { floorPlanId } = params

  let plan: FloorPlan
  let siblingPlans: FloorPlan[]
  let rooms: Room[]
  let initialFloor: FacilityFloorMap

  try {
    ;[plan, siblingPlans, rooms] = await Promise.all([
      apiFetch<FloorPlan>(`/floor-plans/${floorPlanId}`, token),
      apiFetch<FloorPlan[]>('/floor-plans', token),
      apiFetch<Room[]>('/rooms', token),
    ])
  } catch (error) {
    const apiError = error as ApiError
    if (apiError.status === 404) notFound()
    throw error
  }

  const areas = [...plan.areas].sort((a, b) => a.code.localeCompare(b.code))
  const areaIds = new Set(plan.areas.map((area) => area.id))
  const mappedRooms = rooms.filter((room) => areaIds.has(room.floorPlanAreaId))
  const relatedPlans = [...siblingPlans]
    .filter((candidate) => candidate.locationId === plan.locationId)
    .sort((left, right) => left.name.localeCompare(right.name))

  try {
    initialFloor = mapFacilityFloorApiToViewModel(
      await apiFetch<FacilityFloorMapResponse>(`/floor-plans/${floorPlanId}/facility-map`, token),
    )
  } catch (error) {
    const apiError = error as ApiError
    if (apiError.status && apiError.status !== 404) {
      throw error
    }

    initialFloor = buildFacilityFloorMap(plan, mappedRooms)
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/floor-plans" className="text-sm text-accent-primary hover:underline">
          Back to Floor Plans
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">{plan.name}</h1>
        <StatusBadge status={plan.active ? 'active' : 'inactive'} />
      </div>

      {relatedPlans.length > 1 && (
        <div className="mb-4 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Facility Floors</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedPlans.map((candidate) => {
              const isActive = candidate.id === plan.id

              return isActive ? (
                <span
                  key={candidate.id}
                  className="rounded-full border border-accent-primary bg-[rgba(47,143,131,0.12)] px-3 py-1 text-sm text-text-primary"
                >
                  {candidate.name}
                </span>
              ) : (
                <Link
                  key={candidate.id}
                  href={`/floor-plans/${candidate.id}`}
                  className="rounded-full border border-border-subtle px-3 py-1 text-sm text-text-secondary transition-colors hover:border-accent-primary hover:text-text-primary"
                >
                  {candidate.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <LiveFacilityFloorExplorer floorPlanId={floorPlanId} initialFloor={initialFloor} />

      <div className="mt-4 bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-2/50">
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Source Geometry</p>
          <p className="mt-2 text-sm text-text-secondary">
            This floor view is currently derived from the existing AO OS floor-plan rectangles and live room states. It is the clean bridge into a future persisted Facility/Floor/Zone/AccessNode model.
          </p>
        </div>
        <div>
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-secondary">Areas ({areas.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-active uppercase tracking-wide">
                  Code
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-active uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-active uppercase tracking-wide">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {areas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-muted">
                    No areas.
                  </td>
                </tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{area.code}</td>
                    <td className="px-4 py-2 text-xs text-text-primary">{area.name}</td>
                    <td className="px-4 py-2 text-xs text-text-muted">{area.areaType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
