'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { StaffUser } from '@/types/api'

export function StaffClient({ token }: { token: string }) {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    apiGet<StaffUser[]>('/staff-users', token)
      .then(setStaffUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = query
    ? staffUsers.filter((u) => {
        const q = query.toLowerCase()
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          (u.isActive ? 'active' : 'inactive').includes(q)
        )
      })
    : staffUsers

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6 text-text-primary">Staff</h1>

      {error && (
        <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, role, status, or ID"
              className="form-input flex-1"
            />
            {query && (
              <button onClick={() => setQuery('')} className="btn-secondary">
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-sm">
          <thead className="bg-surface-2 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No staff users found.</td></tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium text-text-primary">{user.fullName}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={user.isActive ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
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
