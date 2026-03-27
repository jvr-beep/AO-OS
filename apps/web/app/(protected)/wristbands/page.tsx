import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import {
  activateCredentialAction,
  issueCredentialAction,
  replaceCredentialAction,
  suspendCredentialAction,
} from '@/app/actions/operators'
import type { Wristband } from '@/types/api'

export default async function WristbandsPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  const wristbands = await apiFetch<Wristband[]>('/wristbands', session.accessToken!)
  const role = session.user?.role
  const canManageCredentialLifecycle = role === 'operations' || role === 'admin'
  const canActivateCredential = role === 'front_desk' || role === 'operations' || role === 'admin'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Wristbands</h1>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Issue Credential</h2>
          {!canManageCredentialLifecycle && (
            <p className="text-xs text-amber-700 mb-2">operations/admin only</p>
          )}
          <form action={issueCredentialAction} className="space-y-2">
            <input
              name="uid"
              placeholder="New wristband UID"
              className="w-full rounded border px-2 py-1.5 text-sm"
              required
            />
            <input
              name="memberId"
              placeholder="Member ID"
              className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className="rounded bg-blue-700 disabled:bg-gray-300 text-white text-sm px-3 py-1.5"
            >
              Issue
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Activate Credential</h2>
          {!canActivateCredential && <p className="text-xs text-amber-700 mb-2">front_desk/operations/admin only</p>}
          <form action={activateCredentialAction} className="space-y-2">
            <input
              name="credentialId"
              placeholder="Credential ID"
              className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              required
            />
            <button
              disabled={!canActivateCredential}
              className="rounded bg-blue-700 disabled:bg-gray-300 text-white text-sm px-3 py-1.5"
            >
              Activate
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Suspend Credential</h2>
          {!canManageCredentialLifecycle && (
            <p className="text-xs text-amber-700 mb-2">operations/admin only</p>
          )}
          <form action={suspendCredentialAction} className="space-y-2">
            <input
              name="credentialId"
              placeholder="Credential ID"
              className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className="rounded bg-amber-700 disabled:bg-gray-300 text-white text-sm px-3 py-1.5"
            >
              Suspend
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Replace Credential</h2>
          {!canManageCredentialLifecycle && (
            <p className="text-xs text-amber-700 mb-2">operations/admin only</p>
          )}
          <form action={replaceCredentialAction} className="space-y-2">
            <input
              name="oldCredentialId"
              placeholder="Old credential ID"
              className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              required
            />
            <input
              name="newCredentialUid"
              placeholder="New wristband UID"
              className="w-full rounded border px-2 py-1.5 text-sm"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className="rounded bg-blue-700 disabled:bg-gray-300 text-white text-sm px-3 py-1.5"
            >
              Replace
            </button>
          </form>
        </div>
      </div>

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
