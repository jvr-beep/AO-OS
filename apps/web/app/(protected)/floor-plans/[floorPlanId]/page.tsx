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
        <Link href="/floor-plans" className="text-sm text-ao-teal hover:text-ao-primary transition-colors">
          ← Floor Plans
        </Link>
        <h1 className="text-2xl font-semibold text-gray-100">{plan.name}</h1>
        <StatusBadge status={plan.active ? 'active' : 'inactive'} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-3">Area Map</h2>
          <div className="relative w-full aspect-[16/10] border border-gray-700 rounded bg-gray-900 overflow-hidden">
            {areas.map((area) => (
              <div
                key={area.id}
                className="absolute border border-ao-teal/40 bg-ao-teal/10 text-[10px] text-ao-teal px-1 py-0.5 overflow-hidden"
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
          <p className="text-xs text-gray-500 mt-2">
            Coordinates are rendered directly from area x/y/width/height values.
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-200">Areas ({areas.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ao-dark border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                  Code
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {areas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    No areas.
                  </td>
                </tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-2 font-mono text-xs text-gray-300">{area.code}</td>
                    <td className="px-4 py-2 text-xs text-gray-200">{area.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">{area.areaType}</td>
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
