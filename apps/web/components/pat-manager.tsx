'use client'

import { useState, useTransition } from 'react'
import { createPatAction, revokePatAction } from '@/app/actions/developer'
import type { PersonalAccessToken } from '@/types/api'

interface PatManagerProps {
  initialPats: PersonalAccessToken[]
}

export function PatManager({ initialPats }: PatManagerProps) {
  const [pats, setPats] = useState<PersonalAccessToken[]>(initialPats)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  function handleCreate(formData: FormData) {
    setError(null)
    setNewToken(null)
    startTransition(async () => {
      const result = await createPatAction(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setNewToken(result.token.rawToken)
        const { rawToken: _, ...patWithoutRaw } = result.token
        setPats((prev) => [patWithoutRaw, ...prev])
      }
    })
  }

  function handleRevoke(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await revokePatAction(id)
      if ('error' in result) {
        setError(result.error)
      } else {
        setPats((prev) => prev.map((p) => (p.id === id ? result.pat : p)))
      }
    })
  }

  function handleCopy() {
    if (!newToken) return
    navigator.clipboard.writeText(newToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function dismissToken() {
    setNewToken(null)
    setCopied(false)
  }

  const activePats = pats.filter((p) => !p.revokedAt)
  const revokedPats = pats.filter((p) => p.revokedAt)

  return (
    <div className="space-y-6">
      {/* Create new token form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Generate New Token</h2>
        <form action={handleCreate} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="pat-name" className="block text-sm font-medium text-gray-700 mb-1">
                Token name
              </label>
              <input
                id="pat-name"
                name="name"
                type="text"
                required
                placeholder="e.g. N8N integration, CI pipeline"
                className="form-input w-full"
              />
            </div>
            <div className="sm:w-48">
              <label htmlFor="pat-expires" className="block text-sm font-medium text-gray-700 mb-1">
                Expires (optional)
              </label>
              <input
                id="pat-expires"
                name="expiresAt"
                type="date"
                className="form-input w-full"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Generating…' : 'Generate token'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {newToken && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded space-y-2">
            <p className="text-sm font-semibold text-yellow-800">
              ⚠ Copy this token now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 block text-xs font-mono bg-white border border-yellow-200 rounded px-3 py-2 break-all">
                {newToken}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary text-xs shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              type="button"
              onClick={dismissToken}
              className="text-xs text-yellow-700 underline"
            >
              I've saved my token, dismiss
            </button>
          </div>
        )}
      </div>

      {/* Active tokens */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Active Tokens</h2>
          <p className="text-xs text-gray-500 mt-1">
            Tokens can be used as a Bearer token in API requests.
          </p>
        </div>
        {activePats.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No active tokens.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Prefix
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Expires
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Last used
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {activePats.map((pat) => (
                <tr key={pat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{pat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{pat.prefix}…</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(pat.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {pat.expiresAt ? new Date(pat.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {pat.lastUsedAt ? new Date(pat.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRevoke(pat.id)}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Revoked tokens */}
      {revokedPats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden opacity-60">
          <div className="px-6 py-4 border-b">
            <h2 className="text-base font-semibold text-gray-500">Revoked Tokens</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Prefix
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Revoked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {revokedPats.map((pat) => (
                <tr key={pat.id}>
                  <td className="px-4 py-3 text-gray-400 line-through">{pat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{pat.prefix}…</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {pat.revokedAt ? new Date(pat.revokedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
