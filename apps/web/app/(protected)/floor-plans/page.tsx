import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { FloorPlan } from '@/types/api'

export default async function FloorPlansPage() {
  const session = await getSession()
  const floorPlans = await apiFetch<FloorPlan[]>('/floor-plans', session.accessToken!)

  const orderedPlans = [...floorPlans].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Floor Plans</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {orderedPlans.length === 0 ? (
          <div className="card p-6 text-sm text-gray-400">
            No floor plans found.
          </div>
        ) : (
          orderedPlans.map((plan) => (
            <div key={plan.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-100">{plan.name}</h2>
                <StatusBadge status={plan.active ? 'active' : 'inactive'} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                <dt className="text-gray-400">Areas</dt>
                <dd className="text-gray-200">{plan.areas.length}</dd>
                <dt className="text-gray-400">Location ID</dt>
                <dd className="font-mono text-xs text-gray-300 break-all">{plan.locationId}</dd>
              </dl>
              <Link
                href={`/floor-plans/${plan.id}`}
                className="text-sm text-ao-teal hover:text-ao-primary transition-colors"
              >
                View map →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
