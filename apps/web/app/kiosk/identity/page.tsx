import { identifyGuestAction } from '../actions/visit'

export default function KioskIdentityPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-12">
          <h1 className="text-5xl font-heading tracking-[0.35em] text-text-primary mb-2">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-[0.3em]">Sanctuary</p>
        </div>

        <p className="text-center text-sm text-text-secondary mb-8 leading-relaxed">
          All May Enter Who Honor the House.
        </p>

        <form action={identifyGuestAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">First Name</label>
              <input
                name="firstName"
                type="text"
                required
                autoFocus
                className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Last Name</label>
              <input
                name="lastName"
                type="text"
                className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Email (optional)</label>
            <input
              name="email"
              type="email"
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="for your visit receipt"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Phone (optional)</label>
            <input
              name="phone"
              type="tel"
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          {searchParams.error && (
            <p className="text-critical text-xs text-center">{searchParams.error}</p>
          )}

          <button
            type="submit"
            className="w-full btn-primary py-4 text-sm uppercase tracking-widest mt-2"
          >
            Begin
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-8">
          Already a member?{' '}
          <a href="/member/login" className="text-accent-primary">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  )
}
