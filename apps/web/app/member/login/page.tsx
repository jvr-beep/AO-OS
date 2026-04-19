import { memberLoginAction } from '../actions/auth'

export default function MemberLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Member Portal</p>
        </div>

        <form action={memberLoginAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors placeholder-text-muted"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors placeholder-text-muted"
              placeholder="••••••••"
            />
          </div>

          {searchParams.error && (
            <p className="text-critical text-xs text-center">{searchParams.error}</p>
          )}

          <button
            type="submit"
            className="w-full btn-primary py-3 text-sm tracking-widest uppercase"
          >
            Enter
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-8 leading-relaxed">
          All May Enter Who Honor the House.
        </p>
      </div>
    </div>
  )
}
