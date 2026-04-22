'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPatch, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'

interface DurationOption {
  id: string
  durationMinutes: number
  priceCents: number
  active: boolean
}

interface AdminTier {
  id: string
  code: string
  productType: string
  name: string
  publicDescription: string | null
  upgradeRank: number
  basePriceCents: number
  active: boolean
  durationOptions: DurationOption[]
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function TierRow({
  tier,
  token,
  onUpdated,
}: {
  tier: AdminTier
  token: string
  onUpdated: (updated: AdminTier) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: tier.name,
    publicDescription: tier.publicDescription ?? '',
    basePriceCents: String(tier.basePriceCents),
    upgradeRank: String(tier.upgradeRank),
  })

  const [addDur, setAddDur] = useState({ durationMinutes: '', priceCents: '' })
  const [addingDur, setAddingDur] = useState(false)

  async function saveEdit() {
    setSaving(true)
    setErr(null)
    try {
      const updated = await apiPatch<AdminTier>(`/catalog/admin/tiers/${tier.id}`, {
        name: form.name.trim(),
        publicDescription: form.publicDescription.trim() || null,
        basePriceCents: Number(form.basePriceCents),
        upgradeRank: Number(form.upgradeRank),
      }, token)
      onUpdated(updated)
      setEditing(false)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    setSaving(true)
    try {
      const updated = await apiPatch<AdminTier>(`/catalog/admin/tiers/${tier.id}`, { active: !tier.active }, token)
      onUpdated(updated)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleDuration(dur: DurationOption) {
    try {
      const updated = await apiPatch<AdminTier>(`/catalog/admin/tiers/${tier.id}/durations/${dur.id}`, { active: !dur.active }, token)
      onUpdated({ ...tier, durationOptions: tier.durationOptions.map((d) => d.id === dur.id ? { ...d, active: !dur.active } : d) })
    } catch (e: any) {
      setErr(e.message)
    }
  }

  async function addDuration(e: React.FormEvent) {
    e.preventDefault()
    setAddingDur(true)
    setErr(null)
    try {
      const newDur = await apiPost<DurationOption>(`/catalog/admin/tiers/${tier.id}/durations`, {
        durationMinutes: Number(addDur.durationMinutes),
        priceCents: Number(addDur.priceCents),
      }, token)
      onUpdated({ ...tier, durationOptions: [...tier.durationOptions, newDur].sort((a, b) => a.durationMinutes - b.durationMinutes) })
      setAddDur({ durationMinutes: '', priceCents: '' })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setAddingDur(false)
    }
  }

  return (
    <div className={`card p-4 border ${tier.active ? 'border-border-subtle' : 'border-gray-700 opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                placeholder="Tier name"
              />
              <textarea
                value={form.publicDescription}
                onChange={(e) => setForm((f) => ({ ...f, publicDescription: e.target.value }))}
                className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-xs resize-none"
                rows={2}
                placeholder="Public description (optional)"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Base Price (cents)</label>
                  <input
                    type="number"
                    value={form.basePriceCents}
                    onChange={(e) => setForm((f) => ({ ...f, basePriceCents: e.target.value }))}
                    className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-400 mb-1">Rank</label>
                  <input
                    type="number"
                    value={form.upgradeRank}
                    onChange={(e) => setForm((f) => ({ ...f, upgradeRank: e.target.value }))}
                    className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-white">{tier.name}</p>
                <span className="text-xs text-gray-400 font-mono">{tier.code}</span>
                <span className="text-xs text-gray-500 capitalize">{tier.productType}</span>
              </div>
              {tier.publicDescription && (
                <p className="text-xs text-gray-400 mb-1">{tier.publicDescription}</p>
              )}
              <p className="text-xs text-gray-400">Base: {formatPrice(tier.basePriceCents)} · Rank: {tier.upgradeRank}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={tier.active ? 'active' : 'inactive'} />
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-xs btn-primary px-2 py-1 disabled:opacity-50"
              >
                {saving ? '…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setErr(null) }}
                className="text-xs text-gray-400 hover:text-white px-2"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gray-400 hover:text-white uppercase tracking-wider"
              >
                Edit
              </button>
              <button
                onClick={toggleActive}
                disabled={saving}
                className="text-xs text-gray-400 hover:text-white uppercase tracking-wider disabled:opacity-50"
              >
                {tier.active ? 'Disable' : 'Enable'}
              </button>
            </>
          )}
        </div>
      </div>

      {err && <p className="text-red-400 text-xs mb-2">{err}</p>}

      {/* Duration options */}
      <div className="border-t border-gray-700 pt-3 mt-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Duration Options</p>
        <div className="space-y-1 mb-3">
          {tier.durationOptions.length === 0 ? (
            <p className="text-xs text-gray-500">No duration options.</p>
          ) : tier.durationOptions.map((d) => (
            <div key={d.id} className={`flex items-center justify-between text-xs ${d.active ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
              <span>{d.durationMinutes} min — {formatPrice(d.priceCents)}</span>
              <button
                onClick={() => toggleDuration(d)}
                className="text-xs text-gray-500 hover:text-white ml-4"
              >
                {d.active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addDuration} className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minutes</label>
            <input
              type="number"
              value={addDur.durationMinutes}
              onChange={(e) => setAddDur((a) => ({ ...a, durationMinutes: e.target.value }))}
              placeholder="120"
              className="w-20 bg-surface-0 border border-gray-700 text-white rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price (cents)</label>
            <input
              type="number"
              value={addDur.priceCents}
              onChange={(e) => setAddDur((a) => ({ ...a, priceCents: e.target.value }))}
              placeholder="4500"
              className="w-24 bg-surface-0 border border-gray-700 text-white rounded px-2 py-1 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={addingDur || !addDur.durationMinutes || !addDur.priceCents}
            className="text-xs btn-secondary px-3 py-1 disabled:opacity-50"
          >
            + Add
          </button>
        </form>
      </div>
    </div>
  )
}

export function SettingsClient({ token }: { token: string }) {
  const [tiers, setTiers] = useState<AdminTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'locker' | 'room' | 'all'>('all')

  useEffect(() => {
    apiGet<AdminTier[]>('/catalog/admin/tiers', token)
      .then(setTiers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  function updateTier(updated: AdminTier) {
    setTiers((ts) => ts.map((t) => t.id === updated.id ? updated : t))
  }

  const displayed = tab === 'all' ? tiers : tiers.filter((t) => t.productType === tab)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Section: Tiers */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-4">Pass Catalog</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'locker', 'room'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
                tab === t
                  ? 'bg-accent-primary text-surface-0 font-semibold'
                  : 'bg-surface-1 text-text-muted hover:text-text-primary border border-border-subtle'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <p className="text-text-muted text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="space-y-3">
          {displayed.map((tier) => (
            <TierRow key={tier.id} tier={tier} token={token} onUpdated={updateTier} />
          ))}
          {!loading && displayed.length === 0 && (
            <p className="text-gray-500 text-sm">No tiers found.</p>
          )}
        </div>
      </div>

      {/* Section: Waiver */}
      <div className="mt-10">
        <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-4">Waiver</h2>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white mb-1">Current Waiver Version</p>
              <p className="text-xs text-gray-400">All new kiosk sign-ins must accept this version.</p>
            </div>
            <span className="font-mono text-sm text-accent-primary border border-accent-primary px-3 py-1 rounded">
              AO-WAIVER-v1
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            To publish a new waiver version, update <code className="text-accent-primary">CURRENT_WAIVER_VERSION</code> in <code className="text-accent-primary">waivers.service.ts</code> and deploy. All returning guests will be required to re-sign.
          </p>
        </div>
      </div>
    </div>
  )
}
