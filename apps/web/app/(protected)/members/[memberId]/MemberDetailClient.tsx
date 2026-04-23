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
  if (error || !member) return <div className="max-w-3xl"><p className="text-critical">{error ?? 'Member not found'}</p></div>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/members" className="text-sm text-accent-primary hover:underline">← Members</Link>
        <div className="flex-1">
          {member.alias
            ? <h1 className="text-2xl font-semibold text-text-primary">{member.alias}</h1>
            : <h1 className="text-2xl font-semibold text-text-muted italic">{member.staffSafeDisplayName}</h1>
          }
          <p className="text-xs text-text-muted font-mono mt-0.5">{member.publicMemberNumber ?? member.id}</p>
        </div>
        <StatusBadge status={member.status ?? 'active'} />
        <Link
          href={`/bookings?memberId=${member.id}`}
          className="btn-secondary text-xs"
        >
          Create Booking →
        </Link>
      </div>

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">Member Details</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-muted">ID</dt>
          <dd className="font-mono text-xs text-text-primary break-all">{member.id}</dd>
          <dt className="text-text-muted">Email</dt>
          <dd className="text-text-primary">{member.email}</dd>
          {member.phone && (
            <>
              <dt className="text-text-muted">Phone</dt>
              <dd className="text-text-primary">{member.phone}</dd>
            </>
          )}
          <dt className="text-text-muted">Joined</dt>
          <dd className="text-text-primary">{new Date(member.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>

      {account && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Account</h2>
            <Link href={`/accounts/${memberId}`} className="text-xs text-accent-primary hover:underline">View full ledger →</Link>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-text-muted">Balance</dt>
            <dd className={`font-semibold ${parseFloat(account.balance) < 0 ? 'text-critical' : 'text-success'}`}>
              {account.currency} {account.balance}
            </dd>
            <dt className="text-text-muted">Total Charges</dt>
            <dd className="text-text-primary">{account.currency} {account.postedChargeTotal}</dd>
            <dt className="text-text-muted">Total Payments</dt>
            <dd className="text-text-primary">{account.currency} {account.postedPaymentTotal}</dd>
          </dl>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">Subscriptions</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-text-muted">No subscriptions — pay per visit.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{sub.membershipPlan?.name ?? sub.membershipPlanId}</p>
                  <p className="text-xs text-text-muted">
                    Started {new Date(sub.startDate).toLocaleDateString()}
                    {sub.renewalDate && ` · Renews ${new Date(sub.renewalDate).toLocaleDateString()}`}
                  </p>
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
