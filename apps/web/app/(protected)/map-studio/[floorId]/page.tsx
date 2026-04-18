import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { MapStudioViewer } from './MapStudioViewer'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

interface MapFloor {
  id: string
  name: string
  level: number
  status: string
  description: string | null
  versionCount: number
  publishedVersion: { versionNum: number; label: string | null } | null
}

async function getLiveData(floorId: string, token: string) {
  try {
    const res = await fetch(`${API_BASE}/map-studio/floors/${floorId}/live`, {
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

function levelLabel(level: number): string {
  if (level === 0) return 'Ground Floor'
  if (level > 0) return `Level ${level}`
  return `Basement ${Math.abs(level)}`
}

export default async function MapStudioFloorPage({
  params,
}: {
  params: { floorId: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { floorId } = params

  let floor: MapFloor
  try {
    floor = await apiFetch<MapFloor>(`/map-studio/floors/${floorId}`, token)
  } catch (error) {
    const apiError = error as ApiError
    if (apiError.status === 404) notFound()
    throw error
  }

  const liveData = await getLiveData(floorId, token)

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/map-studio" className="text-sm text-accent-primary hover:underline">
          Map Studio
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-semibold text-text-primary">{floor.name}</h1>
        <StatusBadge status={floor.status} />
        <span className="text-sm text-text-muted">{levelLabel(floor.level)}</span>
      </div>

      {floor.description && (
        <p className="text-sm text-text-muted max-w-2xl">{floor.description}</p>
      )}

      <div className="flex items-center gap-6 text-sm text-text-muted">
        <span>{floor.versionCount} version{floor.versionCount !== 1 ? 's' : ''}</span>
        {floor.publishedVersion ? (
          <span>
            Published: v{floor.publishedVersion.versionNum}
            {floor.publishedVersion.label ? ` — ${floor.publishedVersion.label}` : ''}
          </span>
        ) : (
          <span className="text-warning italic">No published version</span>
        )}
      </div>

      <MapStudioViewer floorId={floorId} initialData={liveData} />
    </div>
  )
}
