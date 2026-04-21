'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Member, Subscription, MemberAccountSummary } from '@/types/api'

export function MemberDetailClient({ token, memberId }: { token: string; memberId: string }) {
  const [member, setMember] = useState<Member | null>(null)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [account, setAccount] = useState<MemberAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Member>(`/members/${memberId}`, token)
      .then((m) => {
        setMember(m)
        return Promise.allSettled([
          apiGet<Subscription[]>(`/members/${memberId}/subscriptions`, token),
          apiGet<MemberAccountSummary>(`/members/${memberId}/account`, token),
        ])
      })
      .then((results) => {
        if (results) {
          if (results[0].status === 'fulfilled') setSubs(results[0].value)
          if (results[1].status === 'fulfilled') setAccount(results[1].value)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [memberId, token])

  if (loading) return <div className="max-w-3xl"><p className="text-text-muted">Loading…</p></div>
  if (error || !member) return <div className="max-w-3xl"><p className="text-red-400">{error ?? 'Member not found'}</p></div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
        <h1 className="text-2xl font-semibold">{member.firstName} {member.lastName}</h1>
        <Link href={`/bookings?memberId=${member.id}`} className="text-xs rounded border border-blue-200 bg-blue-50 text-blue-700 px-2 py-1 hover:bg-blue-100">Create Booking →</Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Member Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">ID</dt><dd className="font-mono text-xs break-all">{member.id}</dd>
          <dt className="text-gray-500">Email</dt><dd>{member.email}</dd>
          {member.phone && <><dt className="text-gray-500">Phone</dt><dd>{member.phone}</dd></>}
          <dt className="text-gray-500">Joined</dt><dd>{new Date(member.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>

      {account && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Account</h2>
            <Link href={`/accounts/${memberId}`} className="text-xs text-blue-600 hover:underline">View full ledger →</Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Balance</dt>
            <dd className={`font-semibold ${parseFloat(account.balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>{account.currency} {account.balance}</dd>
            <dt className="text-gray-500">Total Charges</dt><dd>{account.currency} {account.postedChargeTotal}</dd>
            <dt className="text-gray-500">Total Payments</dt><dd>{account.currency} {account.postedPaymentTotal}</dd>
          </dl>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Subscriptions</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500">No subscriptions.</p>
        ) : (
          <div className="divide-y">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{sub.membershipPlan?.name ?? sub.membershipPlanId}</p>
                  <p className="text-xs text-gray-500">Started {new Date(sub.startDate).toLocaleDateString()}{sub.renewalDate && ` · Renews ${new Date(sub.renewalDate).toLocaleDateString()}`}</p>
                </div>
                <StatusBadge status={sub.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
