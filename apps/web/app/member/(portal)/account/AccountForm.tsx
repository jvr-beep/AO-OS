'use client'

import { useState } from 'react'

interface AccountFormProps {
  memberId: string
  sessionId: string
  initialPreferredName: string
  initialPronouns: string
}

export function AccountForm({ memberId, sessionId, initialPreferredName, initialPronouns }: AccountFormProps) {
  const [preferredName, setPreferredName] = useState(initialPreferredName)
  const [pronouns, setPronouns] = useState(initialPronouns)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(`/api/member/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredName, pronouns }),
      })

      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-surface-1 border border-border-subtle p-5 space-y-4">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">Preferences</h3>

      <div>
        <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
          Preferred Name
        </label>
        <input
          type="text"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          className="w-full bg-surface-2 border border-border-subtle text-text-primary rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
          placeholder="What should we call you?"
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
          Pronouns
        </label>
        <input
          type="text"
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          className="w-full bg-surface-2 border border-border-subtle text-text-primary rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
          placeholder="he/him, they/them, etc."
        />
      </div>

      {error && <p className="text-critical text-xs">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary text-xs uppercase tracking-widest w-full py-2.5"
      >
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
      </button>
    </form>
  )
}
