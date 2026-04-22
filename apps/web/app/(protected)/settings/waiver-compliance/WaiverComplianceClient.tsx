'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'

interface ComplianceGuest {
  id: string
  identifier: string
  latestVersion: string | null
  acceptedAt: string | null
  needsResign: boolean
}

interface ComplianceReport {
  currentVersion: string
  totalOutstanding: number
  guests: ComplianceGuest[]
}

export function WaiverComplianceClient({ token }: { token: string }) {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<ComplianceReport>('/waivers/admin/compliance', token)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Waiver Compliance</h1>
          <p className="text-gray-400 text-sm">Guests who have not accepted the current published waiver version.</p>
        </div>
        <Link href="/settings" className="btn-secondary text-xs">← Settings</Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-700 bg-red-900 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      {!loading && report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{report.totalOutstanding}</p>
            <p className="text-xs text-gray-400 mt-1">Guests Need Re-sign</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-lg font-bold text-white font-mono">{report.currentVersion}</p>
            <p className="text-xs text-gray-400 mt-1">Current Version</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-200">
            Outstanding Guests ({report?.totalOutstanding ?? 0})
          </h2>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Guest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Last Signed Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Last Accepted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {!report || report.guests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    All guests are up to date.
                  </td>
                </tr>
              ) : report.guests.map((g) => (
                <tr key={g.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-xs text-gray-300">{g.identifier}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{g.latestVersion ?? 'Never signed'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{g.acceptedAt ? new Date(g.acceptedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/guests/${g.id}`} className="text-xs text-accent-primary hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
