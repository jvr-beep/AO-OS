'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'

interface MapFloorVersionSummary {
  id: string; versionNum: number; label: string | null; isDraft: boolean; publishedAt: string | null; createdAt: string
}
interface MapFloor {
  id: string; locationId: string; name: string; level: number; description: string | null
  status: string; sortOrder: number; versionCount: number; publishedVersion: MapFloorVersionSummary | null; createdAt: string; updatedAt: string
}

function levelLabel(level: number): string {
  if (level === 0) return 'Ground'
  if (level > 0) return `Level ${level}`
  return `Basement ${Math.abs(level)}`
}

const API = 'https://api.aosanctuary.com/v1'

function NewFloorForm({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('0')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${API}/map-studio/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          level: parseInt(level, 10),
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message ?? `HTTP ${res.status}`)
      }
      setName(''); setLevel('0'); setDescription('')
      setOpen(false)
      onCreated()
    } catch (e2: unknown) {
      setError(e2 instanceof Error ? e2.message : 'Failed to create floor')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        + New Floor
      </button>
    )
  }

  return (
    <div className="card p-5 mb-6">
      <h2 className="text-sm font-semibold text-text-primary mb-4">New Floor</h2>
      {error && <p className="text-sm text-critical mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground Floor"
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="form-input w-full">
              <option value="-2">Basement 2</option>
              <option value="-1">Basement 1</option>
              <option value="0">Ground (0)</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Main facility — restore rooms, lockers, reception"
            className="form-input w-full"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={!name.trim() || busy} className="btn-primary text-sm disabled:opacity-40">
            {busy ? 'Creating…' : 'Create Floor'}
          </button>
          <button type="button" onClick={() => { setOpen(false); setError(null) }} className="btn-secondary text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function MapStudioClient({ token }: { token: string }) {
  const [floors, setFloors] = useState<MapFloor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`${API}/map-studio/floors`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      })
      .then((data: MapFloor[]) => setFloors(Array.isArray(data) ? data : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load floors'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  if (loading) return <div className="max-w-5xl"><div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-semibold text-text-primary">Map Studio</h1></div><p className="text-text-muted">Loading…</p></div>

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Map Studio</h1>
        {!error && <span className="text-sm text-text-muted font-sans">{floors.length} floor{floors.length !== 1 ? 's' : ''}</span>}
      </div>
      {error && <div className="mb-4 rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">{error}</div>}

      <NewFloorForm token={token} onCreated={load} />

      {floors.length === 0 && !error ? (
        <div className="card p-8 text-center text-sm text-text-muted">No floors configured for this location. Create one above to get started.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {floors.map((floor) => (
            <Link key={floor.id} href={`/map-studio/${floor.id}`} className="card p-5 hover:border-accent-primary transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors">{floor.name}</h2>
                  <p className="text-xs text-text-muted font-sans mt-0.5">{levelLabel(floor.level)}</p>
                </div>
                <StatusBadge status={floor.status} />
              </div>
              {floor.description && <p className="text-sm text-text-muted mb-3 line-clamp-2">{floor.description}</p>}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-text-muted">Versions</dt>
                <dd className="text-text-primary">{floor.versionCount ?? 0}</dd>
                <dt className="text-text-muted">Published</dt>
                <dd className="text-text-primary">
                  {floor.publishedVersion
                    ? `v${floor.publishedVersion.versionNum}${floor.publishedVersion.label ? ` — ${floor.publishedVersion.label}` : ''}`
                    : <span className="text-text-muted italic">draft only</span>}
                </dd>
              </dl>
              <div className="mt-4 text-sm text-accent-primary">Open viewer →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
