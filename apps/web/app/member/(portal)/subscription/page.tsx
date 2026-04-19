import { redirect } from 'next/navigation'
import { getMemberSession } from '@/lib/member-session'
import { getMemberSubscription } from '@/lib/member-api'

const TIER_DESCRIPTIONS: Record<string, string> = {
  ESSENTIAL: 'Entry membership — 1 monthly access credit, RFID express entry, member pricing.',
  RITUAL: '2–3 monthly credits, priority booking, 1 room credit, deeper AO OS personalization.',
  SANCTUARY: '4+ monthly credits, premium priority, room entitlement, private club experience.',
  BLACK: 'Elite tier — top priority, largest credit pool, future international access.',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-success',
  trialing: 'text-info',
  past_due: 'text-warning',
  paused: 'text-text-muted',
  cancelled: 'text-critical',
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function SubscriptionPage() {
  const session = await getMemberSession()
  if (!session.sessionId) redirect('/member/login')

  const subscription = await getMemberSubscription(session.sessionId).catch(() => null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary mb-1">Membership</h2>
        <p className="text-xs text-text-muted">Your AO membership details</p>
      </div>

      {!subscription ? (
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 text-center space-y-3">
          <p className="text-sm text-text-muted">No active membership.</p>
          <p className="text-xs text-text-muted leading-relaxed">
            Join AO to unlock recurring access, priority booking, and the full member experience.
          </p>
          <a
            href="/member/subscription/join"
            className="btn-primary inline-flex mx-auto text-xs uppercase tracking-widest"
          >
            Join AO
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan card */}
          <div className="rounded-xl bg-surface-1 border border-border-strong p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-accent-primary opacity-60" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Plan</p>
                <h3 className="text-lg font-heading uppercase tracking-widest text-text-primary">
                  {subscription.planName}
                </h3>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${STATUS_STYLES[subscription.status] ?? 'text-text-muted'}`}>
                {subscription.status.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed mb-5">
              {TIER_DESCRIPTIONS[subscription.planCode] ?? subscription.description ?? ''}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Price</p>
                <p className="text-sm text-text-primary">
                  ${subscription.priceAmount} {subscription.currency}/{subscription.billingInterval}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                  {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}
                </p>
                <p className="text-sm text-text-primary">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            </div>
          </div>

          {/* Member since */}
          <div className="rounded-lg bg-surface-1 border border-border-subtle p-4">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Member since</p>
            <p className="text-sm text-text-primary">{formatDate(subscription.startDate)}</p>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg bg-surface-1 border border-warning p-4">
              <p className="text-xs text-warning uppercase tracking-wider mb-1">Cancellation scheduled</p>
              <p className="text-xs text-text-muted">
                Your membership access continues until {formatDate(subscription.currentPeriodEnd)}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
