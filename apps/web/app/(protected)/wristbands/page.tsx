import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { BrowserApiForm } from '@/components/browser-api-form'
import { StatusBadge } from '@/components/status-badge'
import type { Wristband } from '@/types/api'

export default async function WristbandsPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; q?: string }
}) {
  const session = await getSession()
  const wristbands = await apiFetch<Wristband[]>('/wristbands', session.accessToken!)
  const role = session.user?.role
  const canManageCredentialLifecycle = role === 'operations' || role === 'admin'
  const canActivateCredential = role === 'front_desk' || role === 'operations' || role === 'admin'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error
  const query = searchParams?.q?.trim().toLowerCase() ?? ''

  const filteredWristbands = query
    ? wristbands.filter((wb) => {
        const uid = wb.uid.toLowerCase()
        const status = wb.status.toLowerCase()
        const memberId = wb.memberId?.toLowerCase() ?? ''
        const id = wb.id.toLowerCase()
        return (
          uid.includes(query) ||
          status.includes(query) ||
          memberId.includes(query) ||
          id.includes(query)
        )
      })
    : wristbands

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Wristbands</h1>
      <p className="text-gray-400 mb-6">Credential lifecycle management</p>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold text-ao-primary mb-3 uppercase tracking-wide">Issue Credential</h2>
          <p className="text-xs text-gray-400 mb-3">Allowed roles: operations, admin.</p>
          <BrowserApiForm
            actionPath="/wristbands/issue"
            redirectTo="/wristbands"
            successMessage="Credential issued"
            fallbackErrorMessage="Issue failed"
            className="space-y-3"
            disabled={!canManageCredentialLifecycle}
          >
            <input
              name="uid"
              placeholder="New wristband UID"
              className="form-input"
              required
            />
            <input
              name="memberId"
              placeholder="Member ID"
              className="form-input"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className={!canManageCredentialLifecycle ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}
            >
              Issue
            </button>
          </BrowserApiForm>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-ao-primary mb-3 uppercase tracking-wide">Activate Credential</h2>
          <p className="text-xs text-gray-400 mb-3">Allowed roles: front_desk, operations, admin.</p>
          <BrowserApiForm
            actionPath="/wristbands/activate"
            redirectTo="/wristbands"
            successMessage="Credential activated"
            fallbackErrorMessage="Activate failed"
            className="space-y-3"
            disabled={!canActivateCredential}
          >
            <input
              name="credentialId"
              placeholder="Credential ID"
              className="form-input"
              required
            />
            <button
              disabled={!canActivateCredential}
              className={!canActivateCredential ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}
            >
              Activate
            </button>
          </BrowserApiForm>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-ao-primary mb-3 uppercase tracking-wide">Suspend Credential</h2>
          <p className="text-xs text-gray-400 mb-3">Allowed roles: operations, admin.</p>
          <BrowserApiForm
            actionPath="/wristbands/suspend"
            redirectTo="/wristbands"
            successMessage="Credential suspended"
            fallbackErrorMessage="Suspend failed"
            className="space-y-3"
            disabled={!canManageCredentialLifecycle}
          >
            <input
              name="credentialId"
              placeholder="Credential ID"
              className="form-input"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className={!canManageCredentialLifecycle ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}
            >
              Suspend
            </button>
          </BrowserApiForm>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-ao-primary mb-3 uppercase tracking-wide">Replace Credential</h2>
          <p className="text-xs text-gray-400 mb-3">Allowed roles: operations, admin.</p>
          <BrowserApiForm
            actionPath="/wristbands/replace"
            redirectTo="/wristbands"
            successMessage="Credential replaced"
            fallbackErrorMessage="Replace failed"
            className="space-y-3"
            disabled={!canManageCredentialLifecycle}
          >
            <input
              name="oldCredentialId"
              placeholder="Old credential ID"
              className="form-input"
              required
            />
            <input
              name="newCredentialUid"
              placeholder="New wristband UID"
              className="form-input"
              required
            />
            <button
              disabled={!canManageCredentialLifecycle}
              className={!canManageCredentialLifecycle ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}
            >
              Replace
            </button>
          </BrowserApiForm>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by UID, status, member ID, or wristband ID"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/wristbands" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-600 bg-ao-dark">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                UID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Member ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredWristbands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No wristbands found.
                </td>
              </tr>
            ) : (
              filteredWristbands.map((wb) => (
                <tr key={wb.id} className="hover:bg-gray-700 hover:bg-opacity-30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-200">{wb.uid}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wb.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {wb.memberId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
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
