import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Member, Subscription, MemberAccountSummary } from '@/types/api'

export default async function MemberDetailPage({
  params,
}: {
  params: { memberId: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { memberId } = params

  const [memberResult, subsResult, accountResult] = await Promise.allSettled([
    apiFetch<Member>(`/members/${memberId}`, token),
    apiFetch<Subscription[]>(`/members/${memberId}/subscriptions`, token),
    apiFetch<MemberAccountSummary>(`/members/${memberId}/account`, token),
  ])

  if (memberResult.status === 'rejected') {
    const err = memberResult.reason as ApiError
    if (err.status === 404) notFound()
    throw err
  }

  const member = memberResult.value
  const subs = subsResult.status === 'fulfilled' ? subsResult.value : []
  const account = accountResult.status === 'fulfilled' ? accountResult.value : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">
          {member.firstName} {member.lastName}
        </h1>
        <Link
          href={`/bookings?memberId=${member.id}`}
          className="text-xs rounded border border-blue-200 bg-blue-50 text-blue-700 px-2 py-1 hover:bg-blue-100"
        >
          Create Booking →
        </Link>
      </div>

      {/* Member details */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Member Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">ID</dt>
          <dd className="font-mono text-xs break-all">{member.id}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd>{member.email}</dd>
          {member.phone && (
            <>
              <dt className="text-gray-500">Phone</dt>
              <dd>{member.phone}</dd>
            </>
          )}
          <dt className="text-gray-500">Joined</dt>
          <dd>{new Date(member.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>

      {/* Account summary */}
      {account && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Account</h2>
            <Link
              href={`/accounts/${memberId}`}
              className="text-xs text-blue-600 hover:underline"
            >
              View full ledger →
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Balance</dt>
            <dd
              className={`font-semibold ${
                parseFloat(account.balance) < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {account.currency} {account.balance}
            </dd>
            <dt className="text-gray-500">Total Charges</dt>
            <dd>
              {account.currency} {account.postedChargeTotal}
            </dd>
            <dt className="text-gray-500">Total Payments</dt>
            <dd>
              {account.currency} {account.postedPaymentTotal}
            </dd>
          </dl>
        </div>
      )}

      {/* Subscriptions */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Subscriptions</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500">No subscriptions.</p>
        ) : (
          <div className="divide-y">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {sub.membershipPlan?.name ?? sub.membershipPlanId}
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {new Date(sub.startDate).toLocaleDateString()}
                    {sub.renewalDate &&
                      ` · Renews ${new Date(sub.renewalDate).toLocaleDateString()}`}
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
