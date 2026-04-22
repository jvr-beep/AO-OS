'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPatch, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'

// ── Types ──────────────────────────────────────────────────────────────────

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

interface WaiverDocument {
  id: string
  version: string
  title: string
  body: string
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  effectiveAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface ResourceItem {
  id: string
  displayLabel: string
  resourceType: string
  zoneCode: string
  status: string
  tierName: string
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

const RESOURCE_STATUSES = ['available', 'cleaning', 'out_of_service'] as const

// ── TierRow ────────────────────────────────────────────────────────────────

function TierRow({ tier, token, onUpdated }: { tier: AdminTier; token: string; onUpdated: (u: AdminTier) => void }) {
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
    setSaving(true); setErr(null)
    try {
      const updated = await apiPatch<AdminTier>(`/catalog/admin/tiers/${tier.id}`, {
        name: form.name.trim(),
        publicDescription: form.publicDescription.trim() || null,
        basePriceCents: Number(form.basePriceCents),
        upgradeRank: Number(form.upgradeRank),
      }, token)
      onUpdated(updated); setEditing(false)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function toggleActive() {
    setSaving(true)
    try {
      const updated = await apiPatch<AdminTier>(`/catalog/admin/tiers/${tier.id}`, { active: !tier.active }, token)
      onUpdated(updated)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function toggleDuration(dur: DurationOption) {
    try {
      await apiPatch(`/catalog/admin/tiers/${tier.id}/durations/${dur.id}`, { active: !dur.active }, token)
      onUpdated({ ...tier, durationOptions: tier.durationOptions.map((d) => d.id === dur.id ? { ...d, active: !dur.active } : d) })
    } catch (e: any) { setErr(e.message) }
  }

  async function addDuration(e: React.FormEvent) {
    e.preventDefault(); setAddingDur(true); setErr(null)
    try {
      const newDur = await apiPost<DurationOption>(`/catalog/admin/tiers/${tier.id}/durations`, {
        durationMinutes: Number(addDur.durationMinutes),
        priceCents: Number(addDur.priceCents),
      }, token)
      onUpdated({ ...tier, durationOptions: [...tier.durationOptions, newDur].sort((a, b) => a.durationMinutes - b.durationMinutes) })
      setAddDur({ durationMinutes: '', priceCents: '' })
    } catch (e: any) { setErr(e.message) } finally { setAddingDur(false) }
  }

  return (
    <div className={`card p-4 border ${tier.active ? 'border-border-subtle' : 'border-gray-700 opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" placeholder="Tier name" />
              <textarea value={form.publicDescription} onChange={(e) => setForm((f) => ({ ...f, publicDescription: e.target.value }))}
                className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="Public description (optional)" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Base Price (cents)</label>
                  <input type="number" value={form.basePriceCents} onChange={(e) => setForm((f) => ({ ...f, basePriceCents: e.target.value }))}
                    className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-400 mb-1">Rank</label>
                  <input type="number" value={form.upgradeRank} onChange={(e) => setForm((f) => ({ ...f, upgradeRank: e.target.value }))}
                    className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
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
              {tier.publicDescription && <p className="text-xs text-gray-400 mb-1">{tier.publicDescription}</p>}
              <p className="text-xs text-gray-400">Base: {formatPrice(tier.basePriceCents)} · Rank: {tier.upgradeRank}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={tier.active ? 'active' : 'inactive'} />
          {editing ? (
            <>
              <button onClick={saveEdit} disabled={saving} className="text-xs btn-primary px-2 py-1 disabled:opacity-50">{saving ? '…' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setErr(null) }} className="text-xs text-gray-400 hover:text-white px-2">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">Edit</button>
              <button onClick={toggleActive} disabled={saving} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider disabled:opacity-50">
                {tier.active ? 'Disable' : 'Enable'}
              </button>
            </>
          )}
        </div>
      </div>

      {err && <p className="text-red-400 text-xs mb-2">{err}</p>}

      <div className="border-t border-gray-700 pt-3 mt-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Duration Options</p>
        <div className="space-y-1 mb-3">
          {tier.durationOptions.length === 0 ? (
            <p className="text-xs text-gray-500">No duration options.</p>
          ) : tier.durationOptions.map((d) => (
            <div key={d.id} className={`flex items-center justify-between text-xs ${d.active ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
              <span>{d.durationMinutes} min — {formatPrice(d.priceCents)}</span>
              <button onClick={() => toggleDuration(d)} className="text-xs text-gray-500 hover:text-white ml-4">{d.active ? 'Disable' : 'Enable'}</button>
            </div>
          ))}
        </div>
        <form onSubmit={addDuration} className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minutes</label>
            <input type="number" value={addDur.durationMinutes} onChange={(e) => setAddDur((a) => ({ ...a, durationMinutes: e.target.value }))}
              placeholder="120" className="w-20 bg-surface-0 border border-gray-700 text-white rounded px-2 py-1 text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price (cents)</label>
            <input type="number" value={addDur.priceCents} onChange={(e) => setAddDur((a) => ({ ...a, priceCents: e.target.value }))}
              placeholder="4500" className="w-24 bg-surface-0 border border-gray-700 text-white rounded px-2 py-1 text-xs" />
          </div>
          <button type="submit" disabled={addingDur || !addDur.durationMinutes || !addDur.priceCents}
            className="text-xs btn-secondary px-3 py-1 disabled:opacity-50">+ Add</button>
        </form>
      </div>
    </div>
  )
}

// ── CreateTierForm ─────────────────────────────────────────────────────────

function CreateTierForm({ token, onCreated }: { token: string; onCreated: (t: AdminTier) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', productType: 'locker', name: '', publicDescription: '', basePriceCents: '', upgradeRank: '0' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null)
    try {
      const created = await apiPost<AdminTier>('/catalog/admin/tiers', {
        code: form.code.trim().toUpperCase(),
        productType: form.productType,
        name: form.name.trim(),
        publicDescription: form.publicDescription.trim() || null,
        basePriceCents: Number(form.basePriceCents),
        upgradeRank: Number(form.upgradeRank),
      }, token)
      onCreated(created)
      setOpen(false)
      setForm({ code: '', productType: 'locker', name: '', publicDescription: '', basePriceCents: '', upgradeRank: '0' })
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs btn-secondary px-3 py-1.5">+ New Tier</button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 border border-accent-primary space-y-3">
      <p className="text-xs font-semibold text-accent-primary uppercase tracking-wider">New Tier</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Code (unique)</label>
          <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required
            placeholder="LOCKER-BASIC" className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Product Type</label>
          <select value={form.productType} onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}
            className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm">
            <option value="locker">Locker</option>
            <option value="room">Room</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
            placeholder="Basic Locker" className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Base Price (cents)</label>
          <input type="number" value={form.basePriceCents} onChange={(e) => setForm((f) => ({ ...f, basePriceCents: e.target.value }))} required min="0"
            placeholder="2000" className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Public Description (optional)</label>
          <input value={form.publicDescription} onChange={(e) => setForm((f) => ({ ...f, publicDescription: e.target.value }))}
            placeholder="Shown to guests during checkout" className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-400 mb-1">Rank</label>
          <input type="number" value={form.upgradeRank} onChange={(e) => setForm((f) => ({ ...f, upgradeRank: e.target.value }))} min="0"
            className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm" />
        </div>
      </div>
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="text-xs btn-primary px-3 py-1 disabled:opacity-50">{saving ? 'Creating…' : 'Create Tier'}</button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} className="text-xs text-gray-400 hover:text-white px-2">Cancel</button>
      </div>
    </form>
  )
}

// ── WaiverEditor ────────────────────────────────────────────────────────────

function WaiverEditor({ token }: { token: string }) {
  const [docs, setDocs] = useState<WaiverDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaiverDocument | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newVersion, setNewVersion] = useState('')

  const load = () => {
    apiGet<WaiverDocument[]>('/waivers/admin/documents', token)
      .then((d) => { setDocs(d); if (!selected && d.length > 0) { const pub = d.find((x) => x.status === 'published') ?? d[0]; setSelected(pub); setEditBody(pub.body); setEditTitle(pub.title) } })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  function select(doc: WaiverDocument) {
    setSelected(doc); setEditBody(doc.body); setEditTitle(doc.title); setPreview(false); setErr(null)
  }

  async function saveEdits() {
    if (!selected) return
    setSaving(true); setErr(null)
    try {
      const updated = await apiPatch<WaiverDocument>(`/waivers/admin/documents/${selected.id}`, { title: editTitle, body: editBody }, token)
      setDocs((d) => d.map((x) => x.id === updated.id ? updated : x))
      setSelected(updated)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function publish() {
    if (!selected) return
    if (!confirm(`Publish "${selected.version}"? All guests will be required to re-sign on their next visit.`)) return
    setPublishing(true); setErr(null)
    try {
      const updated = await apiPost<WaiverDocument>(`/waivers/admin/documents/${selected.id}/publish`, {}, token)
      load()
      setSelected(updated)
    } catch (e: any) { setErr(e.message) } finally { setPublishing(false) }
  }

  async function createDraft() {
    if (!newVersion.trim()) return
    setSaving(true); setErr(null)
    try {
      const current = docs.find((d) => d.status === 'published')
      const created = await apiPost<WaiverDocument>('/waivers/admin/documents', {
        version: newVersion.trim(),
        title: current?.title ?? 'AO Sanctuary — House Rules & Waiver of Liability',
        body: current?.body ?? '',
      }, token)
      setCreating(false); setNewVersion('')
      load()
      setSelected(created); setEditBody(created.body); setEditTitle(created.title)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  if (loading) return <p className="text-text-muted text-sm">Loading…</p>

  const published = docs.find((d) => d.status === 'published')
  const drafts = docs.filter((d) => d.status === 'draft')

  return (
    <div className="space-y-4">
      {/* Document list */}
      <div className="flex flex-wrap gap-2 items-center">
        {docs.filter((d) => d.status !== 'archived').map((doc) => (
          <button key={doc.id} onClick={() => select(doc)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              selected?.id === doc.id
                ? 'bg-accent-primary text-surface-0 border-accent-primary font-semibold'
                : 'bg-surface-1 border-border-subtle text-text-muted hover:text-text-primary'
            }`}>
            {doc.version}
            {doc.status === 'published' && <span className="ml-1.5 text-green-400">●</span>}
            {doc.status === 'draft' && <span className="ml-1.5 text-yellow-400">draft</span>}
          </button>
        ))}
        {!creating ? (
          <button onClick={() => setCreating(true)} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">+ New Version</button>
        ) : (
          <div className="flex gap-2 items-center">
            <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder="AO-WAIVER-v2"
              className="w-40 bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-xs font-mono" />
            <button onClick={createDraft} disabled={!newVersion.trim() || saving}
              className="text-xs btn-secondary px-2 py-1 disabled:opacity-50">Create Draft</button>
            <button onClick={() => { setCreating(false); setNewVersion('') }} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
        )}
      </div>

      {selected && (
        <div className="card p-4 border border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm text-accent-primary">{selected.version}</span>
              <span className={`ml-2 text-xs uppercase tracking-wider ${selected.status === 'published' ? 'text-green-400' : selected.status === 'draft' ? 'text-yellow-400' : 'text-gray-500'}`}>
                {selected.status}
              </span>
              {selected.publishedAt && <span className="ml-2 text-xs text-gray-500">Published {fmtDate(selected.publishedAt)}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview((p) => !p)} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">
                {preview ? 'Edit' : 'Preview'}
              </button>
              {selected.status === 'draft' && (
                <>
                  <button onClick={saveEdits} disabled={saving} className="text-xs btn-secondary px-2 py-1 disabled:opacity-50">{saving ? '…' : 'Save Draft'}</button>
                  <button onClick={publish} disabled={publishing} className="text-xs btn-primary px-2 py-1 disabled:opacity-50">{publishing ? 'Publishing…' : 'Publish'}</button>
                </>
              )}
            </div>
          </div>

          {preview ? (
            <div className="bg-surface-0 border border-gray-700 rounded p-4 max-h-80 overflow-y-auto">
              <p className="text-sm font-semibold text-white mb-3">{editTitle}</p>
              <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{editBody}</pre>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={selected.status !== 'draft'}
                  className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-sm disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Body</label>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} disabled={selected.status !== 'draft'}
                  rows={16} className="w-full bg-surface-0 border border-gray-600 text-white rounded px-2 py-1 text-xs font-mono leading-relaxed resize-y disabled:opacity-50" />
              </div>
              {selected.status === 'published' && (
                <p className="text-xs text-gray-500">Published waivers are read-only. Create a new draft version to make changes.</p>
              )}
            </div>
          )}
        </div>
      )}

      {err && <p className="text-red-400 text-xs">{err}</p>}
    </div>
  )
}

// ── ResourceStatusRow ──────────────────────────────────────────────────────

function ResourceStatusRow({ resource, token, onUpdated }: { resource: ResourceItem; token: string; onUpdated: (r: ResourceItem) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function setStatus(status: string) {
    setBusy(true); setErr(null)
    try {
      const updated = await apiPatch<ResourceItem>(`/resources/${resource.id}/status`, { status }, token)
      onUpdated({ ...resource, status: updated.status })
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const statusColor: Record<string, string> = {
    available: 'text-green-400',
    held: 'text-yellow-400',
    occupied: 'text-blue-400',
    cleaning: 'text-orange-400',
    out_of_service: 'text-red-400',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <div className="min-w-0">
        <span className="text-sm text-white font-medium">{resource.displayLabel}</span>
        <span className="ml-2 text-xs text-gray-500">{resource.tierName} · {resource.zoneCode}</span>
        {err && <p className="text-red-400 text-xs mt-0.5">{err}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs uppercase tracking-wider font-mono ${statusColor[resource.status] ?? 'text-gray-400'}`}>{resource.status.replace(/_/g, ' ')}</span>
        {resource.status !== 'occupied' && resource.status !== 'held' && (
          resource.status === 'out_of_service' ? (
            <button onClick={() => setStatus('available')} disabled={busy}
              className="text-xs text-green-400 hover:text-green-300 uppercase tracking-wider disabled:opacity-50">Restore</button>
          ) : (
            <button onClick={() => setStatus('out_of_service')} disabled={busy}
              className="text-xs text-red-400 hover:text-red-300 uppercase tracking-wider disabled:opacity-50">Out of Service</button>
          )
        )}
        {(resource.status === 'occupied' || resource.status === 'held') && (
          <span className="text-xs text-gray-600">In use</span>
        )}
      </div>
    </div>
  )
}

// ── SettingsClient ─────────────────────────────────────────────────────────

export function SettingsClient({ token }: { token: string }) {
  const [tiers, setTiers] = useState<AdminTier[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'locker' | 'room' | 'all'>('all')
  const [section, setSection] = useState<'catalog' | 'waiver' | 'resources'>('catalog')

  useEffect(() => {
    Promise.all([
      apiGet<AdminTier[]>('/catalog/admin/tiers', token),
      apiGet<ResourceItem[]>('/resources', token).catch(() => []),
    ]).then(([t, r]) => { setTiers(t); setResources(r) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  function updateTier(updated: AdminTier) {
    setTiers((ts) => ts.map((t) => t.id === updated.id ? updated : t))
  }

  function addTier(created: AdminTier) {
    setTiers((ts) => [...ts, created].sort((a, b) => a.productType.localeCompare(b.productType) || a.upgradeRank - b.upgradeRank))
  }

  function updateResource(updated: ResourceItem) {
    setResources((rs) => rs.map((r) => r.id === updated.id ? { ...r, ...updated } : r))
  }

  const displayed = tab === 'all' ? tiers : tiers.filter((t) => t.productType === tab)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-subtle pb-4">
        {(['catalog', 'waiver', 'resources'] as const).map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`text-xs px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
              section === s ? 'bg-accent-primary text-surface-0 font-semibold' : 'text-text-muted hover:text-text-primary'
            }`}>
            {s === 'catalog' ? 'Pass Catalog' : s === 'waiver' ? 'Waiver' : 'Resources'}
          </button>
        ))}
      </div>

      {/* Pass Catalog */}
      {section === 'catalog' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide">Pass Catalog</h2>
            <CreateTierForm token={token} onCreated={addTier} />
          </div>

          <div className="flex gap-2 mb-4">
            {(['all', 'locker', 'room'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
                  tab === t ? 'bg-accent-primary text-surface-0 font-semibold' : 'bg-surface-1 text-text-muted hover:text-text-primary border border-border-subtle'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {loading && <p className="text-text-muted text-sm">Loading…</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="space-y-3">
            {displayed.map((tier) => <TierRow key={tier.id} tier={tier} token={token} onUpdated={updateTier} />)}
            {!loading && displayed.length === 0 && <p className="text-gray-500 text-sm">No tiers found.</p>}
          </div>
        </div>
      )}

      {/* Waiver */}
      {section === 'waiver' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide">Waiver Documents</h2>
            <a href="/settings/waiver-compliance" className="text-xs text-accent-primary hover:underline uppercase tracking-wider">Compliance Report →</a>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            The published version is shown to guests at the kiosk. Publishing a new version forces all returning guests to re-sign on their next visit.
          </p>
          <WaiverEditor token={token} />
        </div>
      )}

      {/* Resources */}
      {section === 'resources' && (
        <div>
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-4">Resource Status</h2>
          <p className="text-xs text-gray-400 mb-4">
            Toggle resources out of service to prevent the kiosk from offering them. Occupied or held resources cannot be changed here — check out the active visit first.
          </p>
          {loading && <p className="text-text-muted text-sm">Loading…</p>}
          {resources.length === 0 && !loading && <p className="text-gray-500 text-sm">No resources found.</p>}
          {resources.length > 0 && (
            <div className="card p-4 border border-border-subtle">
              {resources.map((r) => (
                <ResourceStatusRow key={r.id} resource={r} token={token} onUpdated={updateResource} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
