import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Locker } from '@/types/api'

export default async function LockersPage() {
  const session = await getSession()
  const lockers = await apiFetch<Locker[]>('/lockers', session.accessToken!)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Lockers</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Occupant
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Since
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {lockers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No lockers found.
                </td>
              </tr>
            ) : (
              lockers.map((locker) => (
                <tr key={locker.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{locker.code}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={locker.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {locker.currentOccupant?.memberName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {locker.currentOccupant
                      ? new Date(locker.currentOccupant.assignedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/lockers/${locker.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
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
