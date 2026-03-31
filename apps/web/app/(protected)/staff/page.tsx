import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { StaffUser } from '@/types/api'

export default async function StaffPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const session = await getSession()

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  const staffUsers = await apiFetch<StaffUser[]>('/staff-users', session.accessToken!)
  const query = searchParams?.q?.trim().toLowerCase() ?? ''
  const filteredStaffUsers = query
    ? staffUsers.filter((user) => {
        const fullName = user.fullName.toLowerCase()
        const email = user.email.toLowerCase()
        const role = user.role.toLowerCase()
        const id = user.id.toLowerCase()
        const status = (user.isActive ? 'active' : 'inactive').toLowerCase()
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          role.includes(query) ||
          id.includes(query) ||
          status.includes(query)
        )
      })
    : staffUsers

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6 text-text-primary">Staff</h1>

      <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
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
        <table className="w-full text-sm">
          <thead className="bg-surface-2 border-b border-border-subtle">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredStaffUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No staff users found.
                </td>
              </tr>
            ) : (
              filteredStaffUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium text-text-primary">{user.fullName}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
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
