'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Guest } from '@/types/api'

export function GuestsClient({ token }: { token: string }) {
  const [query, setQuery] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const router = useRouter()

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const results = await apiGet<Guest[]>(`/guests?q=${encodeURIComponent(query.trim())}`, token)
      setGuests(results)
      setSearched(true)
    } catch {
      setSearchError('Search failed — try a full email or phone number')
      setGuests([])
    } finally {
      setSearching(false)
    }
  }

  const createGuest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const firstName = (fd.get('firstName') as string ?? '').trim()
    const lastName = (fd.get('lastName') as string ?? '').trim() || undefined
    const email = (fd.get('email') as string ?? '').trim() || undefined
    const phone = (fd.get('phone') as string ?? '').trim() || undefined
    if (!firstName) { setCreateError('First name is required'); return }
    setCreating(true)
    setCreateError(null)
    try {
      const result = await apiPost<{ id: string }>('/guests', { firstName, lastName, email, phone }, token)
      router.push(`/guests/${result.id}?ok=${encodeURIComponent('Guest created')}`)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Create guest failed')
      setCreating(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Guests</h1>
          <p className="text-text-muted text-sm">Search guests by email or phone, or create a new guest profile.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Back to Dashboard</Link>
      </div>

      {createError && (
        <div className="mb-4 rounded-md border border-critical/40 bg-critical/10 text-critical px-3 py-2 text-sm">{createError}</div>
      )}

      <div className="card mb-4">
        <form onSubmit={search} className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or phone"
            className="form-input flex-1"
          />
          <button className="btn-primary" type="submit" disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
          {searched && <button type="button" onClick={() => { setQuery(''); setGuests([]); setSearched(false) }} className="btn-secondary">Clear</button>}
        </form>
      </div>

      {searched && (
        <div className="card overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {searchError ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-critical">{searchError}</td></tr>
              ) : guests.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No guests found.</td></tr>
              ) : guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-surface-1/50 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium">{guest.firstName} {guest.lastName ?? ''}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{guest.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{guest.phone ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={guest.riskFlagStatus === 'flagged' ? 'flagged' : guest.membershipStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/guests/${guest.id}`} className="text-xs text-accent-primary hover:text-accent-primary transition-colors">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Create Guest Profile</h2>
        <p className="text-xs text-text-muted mb-3">Required roles: front_desk, operations, admin.</p>
        <form onSubmit={createGuest} className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input name="firstName" placeholder="First name" className="form-input" required />
          <input name="lastName" placeholder="Last name (optional)" className="form-input" />
          <input name="email" type="email" placeholder="Email (optional)" className="form-input" />
          <input name="phone" placeholder="Phone (optional)" className="form-input" />
          <button className="btn-primary md:col-span-2" disabled={creating}>{creating ? 'Creating…' : 'Create Guest'}</button>
        </form>
      </div>
    </div>
  )
}
