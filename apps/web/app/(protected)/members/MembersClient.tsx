'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Member } from '@/types/api'

function MemberAlias({ member }: { member: Member }) {
  if (member.alias) {
    return <span className="text-text-primary font-medium">{member.alias}</span>
  }
  return <span className="text-text-muted italic text-xs">{member.staffSafeDisplayName}</span>
}

function MemberType({ member }: { member: Member }) {
  if (member.activeSubscription) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-primary/20 text-accent-primary">
        {member.activeSubscription.planName}
      </span>
    )
  }
  return <span className="text-xs text-text-muted">Pay per visit</span>
}

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
          <p className="text-text-muted text-sm">Search by alias, email, member number, or ID.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Back to Dashboard</Link>
      </div>

      {error && <div className="mb-4 rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-text-primary">{error}</div>}

      <div className="card mb-4">
        <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported. Name searches match the member&apos;s AO alias.</p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by alias, email, AO-#, or UUID"
            className="form-input flex-1"
          />
          <button className="btn-primary" type="submit">Search</button>
          {query && <button type="button" onClick={() => { setQuery(''); search('') }} className="btn-secondary">Clear</button>}
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">AO Alias</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No members found.</td></tr>
            ) : members.map((member) => (
              <tr key={member.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3"><MemberAlias member={member} /></td>
                <td className="px-4 py-3 text-xs text-text-muted font-mono">{member.publicMemberNumber ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{member.email}</td>
                <td className="px-4 py-3"><MemberType member={member} /></td>
                <td className="px-4 py-3"><StatusBadge status={member.status ?? 'active'} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/members/${member.id}`} className="text-xs text-accent-primary hover:underline">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
