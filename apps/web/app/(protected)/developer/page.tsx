import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { PatManager } from '@/components/pat-manager'
import type { PersonalAccessToken } from '@/types/api'

export default async function DeveloperSettingsPage() {
  const session = await getSession()

  if (session.user?.role !== 'admin') {
    redirect('/dashboard')
  }

  const pats = await apiFetch<PersonalAccessToken[]>('/developer/pats', session.accessToken!)

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Developer Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage Personal Access Tokens (PATs) for API access. PATs authenticate as you and
          should be kept secret.
        </p>
      </div>

      <PatManager initialPats={pats} />
    </div>
  )
}
