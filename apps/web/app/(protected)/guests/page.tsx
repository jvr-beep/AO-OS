import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { createGuestAction } from '@/app/actions/operators'
import type { Guest } from '@/types/api'

export default async function GuestsPage({
  searchParams,
}: {
  searchParams?: { q?: string; ok?: string; error?: string }
}) {
  const session = await getSession()
  const query = searchParams?.q?.trim() ?? ''
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  let guests: Guest[] = []
  let lookupError: string | null = null

  if (query) {
    try {
      const params = new URLSearchParams({ q: query })
      guests = await apiFetch<Guest[]>(`/guests?${params.toString()}`, session.accessToken!)
    } catch {
      lookupError = 'Search failed — try a full email or phone number'
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Guests</h1>
          <p className="text-gray-400 text-sm">Search guests by email or phone, or create a new guest profile.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">
          Back to Dashboard
        </Link>
      </div>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="card mb-4">
        <form method="get" className="flex flex-col sm:flex-row gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by email or phone"
            className="form-input flex-1"
          />
          <button className="btn-primary" type="submit">
            Search
          </button>
          {query && (
            <Link href="/guests" className="btn-secondary text-center">
              Clear
            </Link>
          )}
        </form>
      </div>

      {query && (
        <div className="card overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {lookupError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-400">
                    {lookupError}
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No guests found.
                  </td>
                </tr>
              ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-white font-medium">
                      {guest.firstName} {guest.lastName ?? ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{guest.email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{guest.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={guest.riskFlagStatus === 'flagged' ? 'flagged' : guest.membershipStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/guests/${guest.id}`}
                        className="text-xs text-accent-primary hover:text-accent-primary transition-colors"
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
      )}

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">Create Guest Profile</h2>
        <p className="text-xs text-gray-400 mb-3">Required roles: front_desk, operations, admin.</p>
        <form action={createGuestAction} className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input name="firstName" placeholder="First name" className="form-input" required />
          <input name="lastName" placeholder="Last name (optional)" className="form-input" />
          <input name="email" type="email" placeholder="Email (optional)" className="form-input" />
          <input name="phone" placeholder="Phone (optional)" className="form-input" />
          <button className="btn-primary md:col-span-2">Create Guest</button>
        </form>
      </div>
    </div>
  )
}
