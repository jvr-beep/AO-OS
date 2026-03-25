import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import type { AuditEvent } from '@/types/api'

export default async function StaffAuditPage() {
  const session = await getSession()

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  const events = await apiFetch<AuditEvent[]>('/staff-audit', session.accessToken!)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/staff" className="text-sm text-blue-600 hover:underline">
          ← Staff
        </Link>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Time
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Staff
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Action
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No audit events.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {ev.staffUser?.fullName ?? `${ev.staffUserId.slice(0, 8)}…`}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{ev.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {ev.targetType
                      ? `${ev.targetType}${ev.targetId ? ` / ${ev.targetId.slice(0, 8)}…` : ''}`
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
