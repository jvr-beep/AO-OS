'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Member } from '@/types/api'

export function MembersClient({ token }: { token: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const search = (q: string) => {
    setLoading(true)
    setError(null)
    const path = q.trim() ? `/members?q=${encodeURIComponent(q.trim())}` : '/members'
    apiGet<Member[]>(path, token)
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { search('') }, [token])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search(query)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Members</h1>
          <p className="text-gray-400 text-sm">Search members by name, email, member number, or ID.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Back to Dashboard</Link>
      </div>

      {error && <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="card mb-4">
        <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, AO-#, or UUID"
            className="form-input flex-1"
          />
          <button className="btn-primary" type="submit">Search</button>
          {query && <button type="button" onClick={() => { setQuery(''); search('') }} className="btn-secondary">Clear Search</button>}
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No members found.</td></tr>
            ) : members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 text-white font-medium">{member.displayName || `${member.firstName} ${member.lastName}`}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{member.publicMemberNumber ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{member.email}</td>
                <td className="px-4 py-3"><StatusBadge status={member.status ?? 'active'} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/members/${member.id}`} className="text-xs text-accent-primary hover:text-accent-primary transition-colors">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
