import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import type { AuditEvent } from '@/types/api'

export default async function StaffAuditPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const session = await getSession()

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  const events = await apiFetch<AuditEvent[]>('/staff-audit', session.accessToken!)
  const query = searchParams?.q?.trim().toLowerCase() ?? ''
  const filteredEvents = query
    ? events.filter((ev) => {
        const actorEmailSnapshot = (ev as AuditEvent & { actorEmailSnapshot?: string }).actorEmailSnapshot ?? ''
        const actorDisplay =
          ev.staffUser?.fullName ?? actorEmailSnapshot ?? ev.staffUserId ?? 'system'
        const action = (ev.action ?? '').toLowerCase()
        const targetType = (ev.targetType ?? '').toLowerCase()
        const targetId = (ev.targetId ?? '').toLowerCase()
        return (
          actorDisplay.toLowerCase().includes(query) ||
          action.includes(query) ||
          targetType.includes(query) ||
          targetId.includes(query)
        )
      })
    : events

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/staff" className="text-sm text-accent-primary hover:underline">
           Staff
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
      </div>

      <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by staff, action, target type, or target ID"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/staff/audit" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-2 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Time
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Staff
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Action
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  No audit events.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-surface-2">
                  {(() => {
                    const actorEmailSnapshot = (
                      ev as AuditEvent & { actorEmailSnapshot?: string }
                    ).actorEmailSnapshot
                    const actorDisplay =
                      ev.staffUser?.fullName ??
                      actorEmailSnapshot ??
                      (ev.staffUserId ? `${ev.staffUserId.slice(0, 8)}…` : 'System')

                    return (
                      <>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-primary">{actorDisplay}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{ev.action}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {ev.targetType
                      ? `${ev.targetType}${ev.targetId ? ` / ${ev.targetId.slice(0, 8)}…` : ''}`
                      : 'd'}
                  </td>
                      </>
                    )
                  })()}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
