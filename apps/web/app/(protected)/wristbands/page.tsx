import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Wristband } from '@/types/api'

export default async function WristbandsPage() {
  const session = await getSession()
  const wristbands = await apiFetch<Wristband[]>('/wristbands', session.accessToken!)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Wristbands</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                UID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Member ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {wristbands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No wristbands found.
                </td>
              </tr>
            ) : (
              wristbands.map((wb) => (
                <tr key={wb.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{wb.uid}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wb.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {wb.memberId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(wb.createdAt).toLocaleDateString()}
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
