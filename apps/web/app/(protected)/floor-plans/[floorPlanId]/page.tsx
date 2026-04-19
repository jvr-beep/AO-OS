import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { FloorPlanLiveView } from './FloorPlanLiveView'
import type { FloorPlan } from '@/types/api'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

async function getLiveData(floorPlanId: string, token: string) {
  try {
    const res = await fetch(`${API_BASE}/floor-plans/${floorPlanId}/live`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AO-Location': LOCATION_CODE,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
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

  // Pre-fetch live data server-side for zero-flash initial render
  const liveData = await getLiveData(floorPlanId, token)

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/floor-plans" className="text-sm text-accent-primary hover:underline">
          Floor Plans
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-semibold text-text-primary">{plan.name}</h1>
        <StatusBadge status={plan.active ? 'active' : 'inactive'} />
      </div>

      {/* Live operational view */}
      <FloorPlanLiveView
        floorPlanId={floorPlanId}
        initialData={liveData}
      />
    </div>
  )
}
