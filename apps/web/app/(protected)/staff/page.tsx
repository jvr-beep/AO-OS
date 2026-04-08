import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { ApiError, apiFetch } from '@/lib/api'
import { BrowserApiForm } from '@/components/browser-api-form'
import { StatusBadge } from '@/components/status-badge'
import type { StaffUser } from '@/types/api'

function formatRoleLabel(role: StaffUser['role']) {
  switch (role) {
    case 'front_desk':
      return 'Front Desk'
    case 'operations':
      return 'Operations'
    case 'admin':
      return 'Admin'
    default:
      return role
  }
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams?: {
    ok?: string
    error?: string
    q?: string
    provisionedEmail?: string
    provisionedAlias?: string
    actionEmail?: string
  }
}) {
  const session = await getSession()

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  let staffUsers: StaffUser[] = []
  let pageErrorMessage: string | null = null

  try {
    staffUsers = await apiFetch<StaffUser[]>('/staff-users', session.accessToken!)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirect('/login')
    }

    pageErrorMessage = 'Could not load staff users right now.'
  }

  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error ?? pageErrorMessage
  const provisionedEmail = searchParams?.provisionedEmail?.trim()
  const provisionedAlias = searchParams?.provisionedAlias?.trim()
  const actionEmail = searchParams?.actionEmail?.trim()
  const query = searchParams?.q?.trim().toLowerCase() ?? ''
  const filteredStaffUsers = query
    ? staffUsers.filter((user) => {
        const fullName = user.fullName.toLowerCase()
        const email = user.email.toLowerCase()
        const role = user.role.toLowerCase()
        const id = user.id.toLowerCase()
        const status = (user.active ? 'active' : 'inactive').toLowerCase()
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          role.includes(query) ||
          id.includes(query) ||
          status.includes(query)
        )
      })
    : staffUsers
  const activeCount = staffUsers.filter((user) => user.active).length
  const inactiveCount = staffUsers.length - activeCount
  const adminCount = staffUsers.filter((user) => user.role === 'admin' && user.active).length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-[11px] font-sans uppercase tracking-[0.28em] text-text-muted">Operations Console</p>
          <h1 className="text-3xl font-semibold text-text-primary">Staff Administration</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Provision Workspace-backed staff access, monitor account status, and control operational permissions from one surface.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="metric-card min-w-[140px]">
            <p className="metric-kicker">Total Staff</p>
            <p className="metric-value">{staffUsers.length}</p>
          </div>
          <div className="metric-card min-w-[140px]">
            <p className="metric-kicker">Active</p>
            <p className="metric-value">{activeCount}</p>
          </div>
          <div className="metric-card min-w-[140px] col-span-2 sm:col-span-1">
            <p className="metric-kicker">Active Admins</p>
            <p className="metric-value">{adminCount}</p>
          </div>
        </div>
      </div>

      {(okMessage || errorMessage) && (
        <div
          className={`notice mb-5 ${
            errorMessage
              ? 'notice-critical'
              : 'notice-success'
          }`}
        >
          {errorMessage ?? okMessage}
          {!errorMessage && provisionedEmail && (
            <div className="mt-2 text-xs text-text-secondary">
              Primary: {provisionedEmail}
              {provisionedAlias ? ` | Alias: ${provisionedAlias}` : ''}
            </div>
          )}
          {!errorMessage && !provisionedEmail && actionEmail && (
            <div className="mt-2 text-xs text-text-secondary">
              Account: {actionEmail}
            </div>
          )}
        </div>
      )}

      <div className="section-frame mb-6 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden p-5 md:p-6">
            <div aria-hidden="true" className="ambient-orb absolute -right-10 top-0 h-36 w-36 rounded-full bg-[rgba(47,143,131,0.10)] blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-2">
                Provision Staff User
              </h2>
              <p className="text-sm text-text-secondary mb-5 max-w-xl">
                Creates the Google Workspace account and matching AO OS staff login. Managed staff accounts should use the @aosanctuary.com domain.
              </p>
              <BrowserApiForm
                actionPath="/staff-users/provision"
                redirectTo="/staff"
                successMessage="Staff user provisioned"
                fallbackErrorMessage="Could not provision the staff user."
                className="space-y-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    name="givenName"
                    placeholder="Given name"
                    className="form-input"
                    required
                  />
                  <input
                    name="familyName"
                    placeholder="Family name"
                    className="form-input"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Primary email"
                    className="form-input"
                    required
                  />
                  <input
                    name="alias"
                    type="email"
                    placeholder="Alias email (optional)"
                    className="form-input"
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Temporary password"
                    className="form-input"
                    required
                    minLength={8}
                  />
                  <select name="role" className="form-input" defaultValue="front_desk">
                    <option value="front_desk">Front Desk</option>
                    <option value="operations">Operations</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 border-t border-[rgba(237,233,227,0.08)] pt-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs leading-5 text-text-muted">
                    Temporary passwords should be rotated at first login. Alias creation is optional and only applies to Workspace-managed staff users.
                  </p>
                  <button type="submit" className="btn-primary whitespace-nowrap">
                    Provision User
                  </button>
                </div>
              </BrowserApiForm>
            </div>
          </div>
          <div className="border-t border-[rgba(237,233,227,0.08)] bg-[rgba(255,255,255,0.02)] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Operational Notes</p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-text-secondary">
              <div>
                <p className="text-text-primary">Managed Accounts</p>
                <p>Provisioning and deactivate/reactivate actions sync to Google Workspace for AO-managed domains.</p>
              </div>
              <div>
                <p className="text-text-primary">Admin Safety</p>
                <p>The last active admin cannot be removed, preserving console access during staffing changes.</p>
              </div>
              <div>
                <p className="text-text-primary">Current State</p>
                <p>{inactiveCount} inactive account{inactiveCount === 1 ? '' : 's'} and {adminCount} active admin{adminCount === 1 ? '' : 's'} in the system.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-frame overflow-hidden">
        <div className="border-b border-[rgba(237,233,227,0.08)] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Directory</p>
              <h2 className="mt-2 text-lg text-text-primary">Staff roster</h2>
            </div>
            <p className="text-xs text-text-muted">
              {query ? `${filteredStaffUsers.length} matching account${filteredStaffUsers.length === 1 ? '' : 's'}` : `${staffUsers.length} total account${staffUsers.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="p-4 border-b border-[rgba(237,233,227,0.08)] md:p-5">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by name, email, role, status, or ID"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/staff" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-[rgba(237,233,227,0.08)] bg-[rgba(255,255,255,0.02)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Joined
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(237,233,227,0.06)]">
              {filteredStaffUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="font-heading text-lg uppercase tracking-[0.14em] text-text-primary">No staff users found</p>
                      <p className="mt-3 text-sm leading-6 text-text-muted">
                        {query
                          ? 'Adjust the search terms or clear the filter to see the full staff roster.'
                          : 'Provision the first staff account to start managing access from this console.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaffUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{user.fullName}</div>
                      <div className="mt-1 text-xs text-text-muted">ID: {user.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.role} />
                      <div className="mt-1 text-xs text-text-muted">{formatRoleLabel(user.role)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.id === session.user?.id ? (
                        <span className="text-xs text-text-muted">Current user</span>
                      ) : user.active ? (
                        <BrowserApiForm
                          actionPath="/staff-users/:staffUserId/deactivate"
                          method="PATCH"
                          redirectTo="/staff"
                          successMessage="Staff user deactivated"
                          fallbackErrorMessage="Could not deactivate that staff user."
                        >
                          <input type="hidden" name="staffUserId" value={user.id} />
                          <input type="hidden" name="email" value={user.email} />
                          <button type="submit" className="btn-secondary text-xs px-2 py-1">
                            Deactivate
                          </button>
                        </BrowserApiForm>
                      ) : (
                        <BrowserApiForm
                          actionPath="/staff-users/:staffUserId/reactivate"
                          method="PATCH"
                          redirectTo="/staff"
                          successMessage="Staff user reactivated"
                          fallbackErrorMessage="Could not reactivate that staff user."
                        >
                          <input type="hidden" name="staffUserId" value={user.id} />
                          <input type="hidden" name="email" value={user.email} />
                          <button type="submit" className="btn-primary text-xs px-2 py-1">
                            Reactivate
                          </button>
                        </BrowserApiForm>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
