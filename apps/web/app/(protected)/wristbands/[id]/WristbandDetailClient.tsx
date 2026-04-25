'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'

interface WristbandDetail {
  id: string
  uid: string
  status: string
  locationId: string | null
  homeLocationId: string | null
  globalAccessFlag: boolean
  issuedAt: string
  activatedAt: string | null
  suspendedAt: string | null
  createdAt: string
}

interface WristbandTransaction {
  id: string
  memberId: string
  wristbandId: string
  transactionType: 'purchase' | 'adjustment' | 'refund'
  merchantType: string
  amount: string
  currency: string
  description: string | null
  status: string
  occurredAt: string
  createdAt: string
}

export function WristbandDetailClient({
  id,
  token,
  role,
}: {
  id: string
  token: string
  role?: string
}) {
  const [wristband, setWristband] = useState<WristbandDetail | null>(null)
  const [transactions, setTransactions] = useState<WristbandTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<WristbandDetail>(`/wristbands/${id}`, token),
      apiGet<WristbandTransaction[]>(`/wristband-transactions?wristbandId=${id}`, token),
    ])
      .then(([wb, txns]) => {
        setWristband(wb)
        setTransactions(txns)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <div className="p-8 text-zinc-400">Loading…</div>
  if (error) return <div className="p-8 text-red-400">{error}</div>
  if (!wristband) return <div className="p-8 text-zinc-400">Wristband not found</div>

  const totalSpend = transactions
    .filter((t) => t.transactionType === 'purchase' && t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)

  const totalRefunds = transactions
    .filter((t) => t.transactionType === 'refund' && t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wristbands" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Wristbands
        </Link>
      </div>

      {/* Wristband summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Wristband</p>
            <p className="font-mono text-lg text-white">{wristband.uid}</p>
          </div>
          <StatusBadge status={wristband.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-zinc-800">
          <Stat label="Issued" value={fmt(wristband.issuedAt)} />
          <Stat label="Activated" value={wristband.activatedAt ? fmt(wristband.activatedAt) : '—'} />
          <Stat label="Global access" value={wristband.globalAccessFlag ? 'Yes' : 'No'} />
          <Stat label="Location" value={wristband.locationId ?? '—'} />
        </div>
      </div>

      {/* Transaction summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Transactions</p>
          <p className="text-2xl font-semibold text-white">{transactions.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Total spend</p>
          <p className="text-2xl font-semibold text-white">${totalSpend.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Refunded</p>
          <p className="text-2xl font-semibold text-emerald-400">${totalRefunds.toFixed(2)}</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-white">Transaction history</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">No transactions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Merchant</th>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">
                    {new Date(tx.occurredAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-zinc-300 capitalize">{tx.merchantType}</td>
                  <td className="px-5 py-3 text-zinc-500">{tx.description ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.transactionType === 'refund'
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : tx.transactionType === 'adjustment'
                        ? 'bg-yellow-900/40 text-yellow-400'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className={`px-5 py-3 text-right font-mono tabular-nums ${
                    tx.transactionType === 'refund' ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {tx.transactionType === 'refund' ? '-' : ''}
                    {tx.currency.toUpperCase()} {parseFloat(tx.amount).toFixed(2)}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-200">{value}</p>
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
