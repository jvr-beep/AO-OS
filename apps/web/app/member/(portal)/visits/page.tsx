import { redirect } from 'next/navigation'
import { getMemberSession } from '@/lib/member-session'
import { getVisitHistory } from '@/lib/member-api'

const MODE_LABELS: Record<string, string> = {
  restore: 'Restore',
  release: 'Release',
  retreat: 'Retreat',
}

const STATUS_COLORS: Record<string, string> = {
  checked_out: 'text-text-muted',
  active: 'text-success',
  cancelled: 'text-critical',
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default async function VisitHistoryPage() {
  const session = await getMemberSession()
  if (!session.sessionId) redirect('/member/login')

  const visits = await getVisitHistory(session.sessionId).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary mb-1">Visit History</h2>
        <p className="text-xs text-text-muted">{visits.length} visit{visits.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {visits.length === 0 ? (
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 text-center">
          <p className="text-sm text-text-muted">No visits yet.</p>
          <p className="text-xs text-text-muted mt-1">Your ritual history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="rounded-lg bg-surface-1 border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{visit.tierName}</span>
                    {visit.visitMode && (
                      <span className="text-xs text-accent-primary uppercase tracking-wider">
                        {MODE_LABELS[visit.visitMode] ?? visit.visitMode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{formatDate(visit.startTime ?? visit.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-medium uppercase tracking-wider ${STATUS_COLORS[visit.status] ?? 'text-text-muted'}`}>
                    {visit.status.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDuration(visit.durationMinutes)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
