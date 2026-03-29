import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Member } from '@/types/api'

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const session = await getSession()
  const query = searchParams?.q?.trim() ?? ''

  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }

  const path = params.toString() ? `/members?${params.toString()}` : '/members'
  const members = await apiFetch<Member[]>(path, session.accessToken!)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Members</h1>
          <p className="text-gray-400 text-sm">Search members by name, email, member number, or ID.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">
          Back to Dashboard
        </Link>
      </div>

      <div className="card mb-4">
        <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
        <form method="get" className="flex flex-col sm:flex-row gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name, email, AO-#, or UUID"
            className="form-input flex-1"
          />
          <button className="btn-primary" type="submit">
            Search
          </button>
          {query && (
            <Link href="/members" className="btn-secondary text-center">
              Clear Search
            </Link>
          )}
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ao-dark border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Member #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-white font-medium">
                    {member.displayName || `${member.firstName} ${member.lastName}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{member.publicMemberNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{member.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.status ?? 'active'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/members/${member.id}`}
                      className="text-xs text-ao-teal hover:text-ao-primary transition-colors"
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
