import { redirect } from 'next/navigation'
import { getMemberSession } from '@/lib/member-session'
import { getMemberProfile } from '@/lib/member-api'
import { AccountForm } from './AccountForm'
import { memberLogoutAction } from '../../actions/auth'

export default async function AccountPage() {
  const session = await getMemberSession()
  if (!session.sessionId) redirect('/member/login')

  const profile = await getMemberProfile(session.sessionId).catch(() => null)
  if (!profile) redirect('/member/login')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary mb-1">Account</h2>
        <p className="text-xs text-text-muted font-mono">{profile.email ?? 'No email on file'}</p>
      </div>

      {/* Member number */}
      <div className="rounded-lg bg-surface-1 border border-border-subtle p-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Member Number</p>
        <p className="font-mono text-sm text-text-primary tracking-wider">{profile.publicMemberNumber}</p>
      </div>

      {/* Editable profile */}
      <AccountForm
        memberId={profile.id}
        sessionId={session.sessionId}
        initialPreferredName={profile.preferredName ?? ''}
        initialPronouns={profile.pronouns ?? ''}
      />

      {/* Sign out */}
      <div className="pt-4 border-t border-border-subtle">
        <form action={memberLogoutAction}>
          <button
            type="submit"
            className="text-xs text-text-muted uppercase tracking-wider hover:text-critical transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
