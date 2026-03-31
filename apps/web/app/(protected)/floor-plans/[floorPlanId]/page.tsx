import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { FloorPlan } from '@/types/api'

function pct(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? `${parsed}%` : '0%'
}

export default async function FloorPlanDetailPage({
  params,
}: {
  params: { floorPlanId: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { floorPlanId } = params

  let plan: FloorPlan

  try {
    plan = await apiFetch<FloorPlan>(`/floor-plans/${floorPlanId}`, token)
  } catch (error) {
    const apiError = error as ApiError
    if (apiError.status === 404) notFound()
    throw error
  }

  const areas = [...plan.areas].sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/floor-plans" className="text-sm text-accent-primary hover:underline">
           Floor Plans
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">{plan.name}</h1>
        <StatusBadge status={plan.active ? 'active' : 'inactive'} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="bg-surface-1 rounded-lg border border-border-subtle p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Area Map</h2>
          <div className="relative w-full aspect-[16/10] border border-border-subtle rounded bg-surface-2 overflow-hidden">
            {areas.map((area) => (
              <div
                key={area.id}
                className="absolute border border-accent-active/40 bg-accent-active/10 text-[10px] text-accent-active px-1 py-0.5 overflow-hidden"
                style={{
                  left: pct(area.x),
                  top: pct(area.y),
                  width: pct(area.width),
                  height: pct(area.height),
                }}
                title={`${area.code} · ${area.name}`}
              >
                <div className="font-semibold truncate">{area.code}</div>
                <div className="truncate">{area.name}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Coordinates are rendered directly from area x/y/width/height values.
          </p>
        </div>

        <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
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
