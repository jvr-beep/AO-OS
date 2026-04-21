'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { MemberAccountSummary, MemberAccountEntry } from '@/types/api'

export function AccountClient({ token, memberId }: { token: string; memberId: string }) {
  const [summary, setSummary] = useState<MemberAccountSummary | null>(null)
  const [entries, setEntries] = useState<MemberAccountEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      apiGet<MemberAccountSummary>(`/members/${memberId}/account`, token),
      apiGet<MemberAccountEntry[]>(`/members/${memberId}/account/entries`, token),
    ]).then(([s, e]) => {
      if (s.status === 'fulfilled') setSummary(s.value)
      if (e.status === 'fulfilled') setEntries(e.value)
    }).finally(() => setLoading(false))
  }, [memberId, token])

  if (loading) return <div className="max-w-3xl"><p className="text-text-muted">Loading…</p></div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/members/${memberId}`} className="text-sm text-blue-600 hover:underline">← Member</Link>
        <h1 className="text-2xl font-semibold">Account Ledger</h1>
      </div>

      {summary && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Summary</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Balance</dt>
            <dd className={`font-semibold ${parseFloat(summary.balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.currency} {summary.balance}</dd>
            <dt className="text-gray-500">Total Charges</dt><dd>{summary.currency} {summary.postedChargeTotal}</dd>
            <dt className="text-gray-500">Total Payments</dt><dd>{summary.currency} {summary.postedPaymentTotal}</dd>
            <dt className="text-gray-500">Total Credits</dt><dd>{summary.currency} {summary.postedCreditTotal}</dd>
            <dt className="text-gray-500">Total Refunds</dt><dd>{summary.currency} {summary.postedRefundTotal}</dd>
          </dl>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b"><h2 className="text-sm font-semibold text-gray-700">Ledger Entries ({entries.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No ledger entries.</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(entry.occurredAt).toLocaleDateString()}</td>
                <td className="px-4 py-2"><StatusBadge status={entry.entryType} /></td>
                <td className={`px-4 py-2 font-medium text-sm ${entry.entryType === 'charge' ? 'text-red-600' : 'text-green-600'}`}>{entry.currency} {entry.amount}</td>
                <td className="px-4 py-2"><StatusBadge status={entry.status} /></td>
                <td className="px-4 py-2 text-xs text-gray-500">{entry.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
