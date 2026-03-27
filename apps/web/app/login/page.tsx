import { login } from '@/app/actions/auth'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ao-darker">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl font-black text-ao-primary mb-1">AO</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Staff Portal</p>
          <p className="text-xs text-gray-500 mt-2">Honor the body. Honor the man.</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-lg bg-red-900 border border-red-700 px-4 py-3 text-sm text-red-200">
            Invalid email or password.
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label
              className="form-label"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="form-input"
            />
          </div>
          <div>
            <label
              className="form-label"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="form-input"
            />
          </div>
          <button
            type="submit"
            className="w-full btn-primary"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
