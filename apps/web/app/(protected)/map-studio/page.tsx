import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'

interface MapFloorVersionSummary {
  id: string
  versionNum: number
  label: string | null
  isDraft: boolean
  publishedAt: string | null
  createdAt: string
}

interface MapFloor {
  id: string
  locationId: string
  name: string
  level: number
  description: string | null
  status: string
  sortOrder: number
  versionCount: number
  publishedVersion: MapFloorVersionSummary | null
  createdAt: string
  updatedAt: string
}

function levelLabel(level: number): string {
  if (level === 0) return 'Ground'
  if (level > 0) return `Level ${level}`
  return `Basement ${Math.abs(level)}`
}

export default async function MapStudioPage() {
  const session = await getSession()
  const floors = await apiFetch<MapFloor[]>('/map-studio/floors', session.accessToken!)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-100">Map Studio</h1>
        <span className="text-sm text-text-muted font-sans">{floors.length} floor{floors.length !== 1 ? 's' : ''}</span>
      </div>

      {floors.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">
          No floors configured for this location.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {floors.map((floor) => (
            <Link
              key={floor.id}
              href={`/map-studio/${floor.id}`}
              className="card p-5 hover:border-accent-primary transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-100 group-hover:text-accent-primary transition-colors">
                    {floor.name}
                  </h2>
                  <p className="text-xs text-text-muted font-sans mt-0.5">{levelLabel(floor.level)}</p>
                </div>
                <StatusBadge status={floor.status} />
              </div>

              {floor.description && (
                <p className="text-sm text-text-muted mb-3 line-clamp-2">{floor.description}</p>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-gray-400">Versions</dt>
                <dd className="text-gray-200">{floor.versionCount ?? 0}</dd>
                <dt className="text-gray-400">Published</dt>
                <dd className="text-gray-200">
                  {floor.publishedVersion
                    ? `v${floor.publishedVersion.versionNum}${floor.publishedVersion.label ? ` — ${floor.publishedVersion.label}` : ''}`
                    : <span className="text-text-muted italic">draft only</span>}
                </dd>
              </dl>

              <div className="mt-4 text-sm text-accent-primary">
                Open viewer →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
