import { redirect } from 'next/navigation'
import { getMemberSession } from '@/lib/member-session'
import { getMemberProfile, getActiveVisit } from '@/lib/member-api'
import { MembershipCard } from './components/MembershipCard'
import { ActiveVisitBadge } from './components/ActiveVisitBadge'

// Tier rank → display label
const TIER_LABELS: Record<number, string> = {
  1: 'Essential',
  2: 'Ritual',
  3: 'Sanctuary',
  4: 'Black',
}

export default async function MemberDashboard() {
  const session = await getMemberSession()
  if (!session.sessionId || !session.memberId) redirect('/member/login')

  const [profile, activeVisit] = await Promise.all([
    getMemberProfile(session.sessionId).catch(() => null),
    getActiveVisit(session.sessionId).catch(() => null),
  ])

  if (!profile) redirect('/member/login')

  const tierLabel = profile.subscription
    ? (TIER_LABELS[profile.subscription.tierRank] ?? profile.subscription.planName)
    : null

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Welcome back</p>
        <h2 className="text-2xl font-heading uppercase tracking-widest text-text-primary">
          {profile.preferredName ?? profile.displayName ?? profile.firstName ?? 'Member'}
        </h2>
      </div>

      {/* Digital membership card */}
      <MembershipCard
        memberNumber={profile.publicMemberNumber}
        memberId={profile.id}
        tierLabel={tierLabel}
        subscriptionStatus={profile.subscription?.status ?? null}
      />

      {/* Active visit */}
      {activeVisit ? (
        <ActiveVisitBadge visit={activeVisit} />
      ) : (
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-5 text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">No active visit</p>
          <p className="text-xs text-text-muted mt-1">Visit AO to begin your ritual.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/member/visits" className="rounded-lg bg-surface-1 border border-border-subtle p-4 text-center hover:border-accent-primary transition-colors no-underline">
          <p className="text-xs text-text-muted uppercase tracking-wider">Visit History</p>
        </a>
        <a href="/member/subscription" className="rounded-lg bg-surface-1 border border-border-subtle p-4 text-center hover:border-accent-primary transition-colors no-underline">
          <p className="text-xs text-text-muted uppercase tracking-wider">Membership</p>
        </a>
      </div>
    </div>
  )
}
