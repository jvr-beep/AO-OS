'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { FloorPlan } from '@/types/api'

export function FloorPlansClient({ token }: { token: string }) {
  const [plans, setPlans] = useState<FloorPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<FloorPlan[]>('/floor-plans', token)
      .then((data) => setPlans([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="max-w-5xl"><h1 className="text-2xl font-semibold mb-6 text-gray-100">Floor Plans</h1><p className="text-text-muted">Loading…</p></div>

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Floor Plans</h1>
      {error && <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {plans.length === 0 ? (
          <div className="card p-6 text-sm text-gray-400">No floor plans found.</div>
        ) : (
          plans.map((plan) => (
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
              <Link href={`/floor-plans/${plan.id}`} className="text-sm text-accent-primary hover:text-accent-primary transition-colors">
                View map →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
