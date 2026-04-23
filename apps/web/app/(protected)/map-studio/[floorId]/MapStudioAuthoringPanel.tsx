'use client'

import { useCallback, useRef, useState } from 'react'

type Tab = 'upload' | 'versions' | 'objects' | 'ai'

interface MapFloorVersion {
  id: string
  versionNum: number
  label: string | null
  isDraft: boolean
  publishedAt: string | null
  createdBy: string | null
  notes: string | null
  createdAt: string
}

interface MapObject {
  id: string
  svgElementId: string | null
  objectType: string
  code: string
  label: string
  roomId: string | null
  accessPointId: string | null
  lockerId: string | null
  accessZoneId: string | null
  posX: number | null
  posY: number | null
  active: boolean
}

interface ApprovalState {
  versionId: string
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: string
  reviewedBy: string | null
  reviewNote: string | null
  requestedAt: string
  resolvedAt: string | null
}

interface AiSuggestion {
  type: string
  severity: 'info' | 'warning' | 'critical'
  objectCode: string | null
  message: string
  suggestion: string | null
}

interface AiAnalysis {
  floorName: string
  objectCount: number
  analysedAt: string
  suggestions: AiSuggestion[]
  summary: string
}

const OBJECT_TYPES = [
  'room', 'door', 'access_reader', 'locker_bank',
  'zone_boundary', 'amenity', 'sensor', 'staff_area', 'circulation', 'incident',
]

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

const severityClass = {
  info: 'bg-blue-900/30 text-blue-300',
  warning: 'bg-yellow-900/30 text-yellow-300',
  critical: 'bg-red-900/30 text-red-300',
}

const API = 'https://api.aosanctuary.com/v1'

export function MapStudioAuthoringPanel({ floorId, token }: { floorId: string; token: string }) {
  const base = `${API}/map-studio/floors/${floorId}`
  const auth = { Authorization: `Bearer ${token}` }
  const [tab, setTab] = useState<Tab>('upload')
  const [versions, setVersions] = useState<MapFloorVersion[] | null>(null)
  const [objects, setObjects] = useState<MapObject[] | null>(null)
  const [approvals, setApprovals] = useState<Record<string, ApprovalState | null>>({})
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)

  // Upload tab state
  const fileRef = useRef<HTMLInputElement>(null)
  const [svgPreview, setSvgPreview] = useState<string | null>(null)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [publishOnUpload, setPublishOnUpload] = useState(false)

  // Object editor state
  const [editingObj, setEditingObj] = useState<Partial<MapObject> | null>(null)

  // Approval state
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({})
  const [reviewNote, setReviewNote] = useState('')

  const flash = (text: string, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg(null), 5000)
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  const loadVersions = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions`, { headers: auth, cache: 'no-store' })
      const data: MapFloorVersion[] = await res.json()
      setVersions(data)
      // Load approval status for all draft versions
      const drafts = data.filter((v) => v.isDraft)
      await Promise.all(drafts.map((v) => loadApproval(v.id)))
    } finally {
      setBusy(false)
    }
  }, [floorId])

  const loadApproval = async (versionId: string) => {
    try {
      const res = await fetch(`${base}/versions/${versionId}/approval`, { headers: auth, cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setApprovals((prev) => ({ ...prev, [versionId]: data }))
      }
    } catch { /* non-blocking */ }
  }

  const handleTabClick = (t: Tab) => {
    setTab(t)
    if (t === 'versions' && !versions) loadVersions()
    if (t === 'objects' && !objects) loadObjects()
  }

  const publish = async (versionId: string) => {
    if (!confirm('Publish this version? It will become the live map for this floor.')) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions/${versionId}/publish`, { method: 'PUT', headers: auth })
      if (res.ok) { flash('Version published.'); loadVersions() }
      else { const j = await res.json(); flash(j.message ?? 'Failed to publish.', true) }
    } finally { setBusy(false) }
  }

  const rollback = async (versionId: string, versionNum: number) => {
    if (!confirm(`Create a new draft from v${versionNum}?`)) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions/${versionId}/rollback`, { method: 'POST', headers: auth })
      if (res.ok) { flash(`New draft created from v${versionNum}.`); loadVersions() }
      else { flash('Rollback failed.', true) }
    } finally { setBusy(false) }
  }

  const requestApproval = async (versionId: string) => {
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions/${versionId}/request-approval`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: approvalNote[versionId] || undefined }),
      })
      if (res.ok) {
        flash('Approval requested — ops team notified via Slack.')
        setApprovalNote((prev) => ({ ...prev, [versionId]: '' }))
        loadVersions()
      } else {
        const j = await res.json()
        flash(j.message ?? 'Request failed.', true)
      }
    } finally { setBusy(false) }
  }

  const approveVersion = async (versionId: string) => {
    if (!confirm('Approve and publish this version?')) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions/${versionId}/approve`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: reviewNote || undefined }),
      })
      if (res.ok) { flash('Version approved and published.'); setReviewNote(''); loadVersions() }
      else { const j = await res.json(); flash(j.message ?? 'Approve failed.', true) }
    } finally { setBusy(false) }
  }

  const rejectVersion = async (versionId: string) => {
    if (!reviewNote.trim()) { flash('Add a review note explaining the rejection.', true); return }
    if (!confirm('Reject this version?')) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions/${versionId}/reject`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote }),
      })
      if (res.ok) { flash('Version rejected.'); setReviewNote(''); loadVersions() }
      else { const j = await res.json(); flash(j.message ?? 'Reject failed.', true) }
    } finally { setBusy(false) }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSvgPreview(reader.result as string)
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!svgPreview) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/versions`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svgContent: svgPreview,
          label: uploadLabel || undefined,
          notes: uploadNotes || undefined,
          publish: publishOnUpload,
        }),
      })
      if (res.ok) {
        flash(publishOnUpload ? 'Version uploaded and published.' : 'Draft version uploaded.')
        setSvgPreview(null); setUploadLabel(''); setUploadNotes(''); setPublishOnUpload(false)
        if (fileRef.current) fileRef.current.value = ''
        setVersions(null)
      } else {
        const j = await res.json(); flash(j.message ?? 'Upload failed.', true)
      }
    } finally { setBusy(false) }
  }

  // ── Objects ───────────────────────────────────────────────────────────────

  const loadObjects = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(`${base}/objects`, { headers: auth, cache: 'no-store' })
      setObjects(await res.json())
    } finally { setBusy(false) }
  }, [floorId])

  const saveObject = async () => {
    if (!editingObj || !editingObj.code || !editingObj.label || !editingObj.objectType) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/objects`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(editingObj),
      })
      if (res.ok) { flash('Object saved.'); setEditingObj(null); loadObjects() }
      else { const j = await res.json(); flash(j.message ?? 'Save failed.', true) }
    } finally { setBusy(false) }
  }

  const deleteObject = async (obj: MapObject) => {
    if (!confirm(`Delete object "${obj.label}" (${obj.code})?`)) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/objects/${obj.id}`, { method: 'DELETE', headers: auth })
      if (res.ok || res.status === 204) { flash('Object deleted.'); loadObjects() }
      else { flash('Delete failed.', true) }
    } finally { setBusy(false) }
  }

  // ── AI Analysis ───────────────────────────────────────────────────────────

  const runAiAnalysis = async () => {
    setBusy(true)
    setAiAnalysis(null)
    try {
      const res = await fetch(`${base}/ai-analyze`, { method: 'POST', headers: auth })
      if (res.ok) { setAiAnalysis(await res.json()) }
      else { const j = await res.json(); flash(j.message ?? 'Analysis failed.', true) }
    } finally { setBusy(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-accent-primary text-text-primary'
        : 'border-transparent text-text-muted hover:text-text-primary'
    }`

  return (
    <div className="card">
      {/* Tabs */}
      <div className="flex border-b border-border-subtle px-4">
        <button className={tabClass('upload')} onClick={() => handleTabClick('upload')}>Upload SVG</button>
        <button className={tabClass('versions')} onClick={() => handleTabClick('versions')}>Versions</button>
        <button className={tabClass('objects')} onClick={() => handleTabClick('objects')}>Objects</button>
        <button className={tabClass('ai')} onClick={() => handleTabClick('ai')}>AI Analysis</button>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded text-sm ${msg.error ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
          {msg.text}
        </div>
      )}

      <div className="p-4">
        {/* ── Upload Tab ────────────────────────────────────── */}
        {tab === 'upload' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm text-text-muted mb-1">SVG File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={onFileChange}
                className="block w-full text-sm text-text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-sm file:bg-surface-2 file:text-text-primary hover:file:bg-surface-1 cursor-pointer"
              />
            </div>
            {svgPreview && (
              <div className="border border-border-subtle rounded p-3 bg-surface-2 overflow-auto max-h-48">
                <div dangerouslySetInnerHTML={{ __html: svgPreview }} className="w-full" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Version Label (optional)</label>
                <input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="e.g. Ground floor v2" className="w-full bg-surface-2 border border-border-subtle rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Notes (optional)</label>
                <input value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="What changed?" className="w-full bg-surface-2 border border-border-subtle rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={publishOnUpload} onChange={(e) => setPublishOnUpload(e.target.checked)} className="accent-accent-primary" />
              Publish immediately (skip draft)
            </label>
            <button onClick={handleUpload} disabled={!svgPreview || busy} className="btn-primary text-sm disabled:opacity-40">
              {busy ? 'Uploading…' : 'Upload Version'}
            </button>
          </div>
        )}

        {/* ── Versions Tab ──────────────────────────────────── */}
        {tab === 'versions' && (
          <div>
            {!versions ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-text-muted italic">No versions yet. Upload an SVG to get started.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => {
                  const approval = approvals[v.id]
                  return (
                    <div key={v.id} className="p-3 rounded border border-border-subtle bg-surface-2 space-y-2">
                      {/* Version header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text-primary">v{v.versionNum}</span>
                            {v.label && <span className="text-sm text-text-muted">— {v.label}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded ${v.isDraft ? 'bg-yellow-900/40 text-yellow-300' : 'bg-green-900/40 text-green-300'}`}>
                              {v.isDraft ? 'draft' : 'published'}
                            </span>
                            {approval && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                approval.status === 'pending' ? 'bg-orange-900/40 text-orange-300' :
                                approval.status === 'approved' ? 'bg-green-900/40 text-green-300' :
                                'bg-red-900/40 text-red-300'
                              }`}>
                                {approval.status === 'pending' ? '⏳ pending approval' :
                                 approval.status === 'approved' ? '✓ approved' : '✗ rejected'}
                              </span>
                            )}
                          </div>
                          {v.notes && <p className="text-xs text-text-muted mt-1">{v.notes}</p>}
                          <p className="text-xs text-text-muted mt-1">{fmt(v.createdAt)}{v.createdBy ? ` · ${v.createdBy}` : ''}</p>
                          {approval?.reviewNote && (
                            <p className="text-xs text-text-muted mt-1 italic">Review note: {approval.reviewNote}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          {v.isDraft && !approval && (
                            <button onClick={() => publish(v.id)} disabled={busy} className="text-xs px-2 py-1 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 disabled:opacity-40">
                              Publish
                            </button>
                          )}
                          {!v.isDraft && (
                            <button onClick={() => rollback(v.id, v.versionNum)} disabled={busy} className="text-xs px-2 py-1 rounded bg-surface-1 text-text-muted hover:text-text-primary disabled:opacity-40">
                              Restore as draft
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Approval actions for drafts */}
                      {v.isDraft && (
                        <div className="border-t border-border-subtle pt-2 space-y-2">
                          {!approval || approval.status === 'rejected' ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={approvalNote[v.id] ?? ''}
                                onChange={(e) => setApprovalNote((prev) => ({ ...prev, [v.id]: e.target.value }))}
                                placeholder="Note for reviewer (optional)"
                                className="flex-1 bg-surface-1 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                              />
                              <button onClick={() => requestApproval(v.id)} disabled={busy} className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 disabled:opacity-40 whitespace-nowrap">
                                Request Approval
                              </button>
                            </div>
                          ) : approval.status === 'pending' ? (
                            <div className="space-y-2">
                              <p className="text-xs text-text-muted">Requested {fmt(approval.requestedAt)} · Awaiting ops review</p>
                              <div className="flex items-center gap-2">
                                <input
                                  value={reviewNote}
                                  onChange={(e) => setReviewNote(e.target.value)}
                                  placeholder="Review note (required for rejection)"
                                  className="flex-1 bg-surface-1 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                                />
                                <button onClick={() => approveVersion(v.id)} disabled={busy} className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-300 hover:bg-green-900/60 disabled:opacity-40">
                                  Approve
                                </button>
                                <button onClick={() => rejectVersion(v.id)} disabled={busy} className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60 disabled:opacity-40">
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Objects Tab ───────────────────────────────────── */}
        {tab === 'objects' && (
          <div className="space-y-4">
            <div className="border border-border-subtle rounded p-4 bg-surface-2 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">{editingObj?.id ? 'Edit Object' : 'Add Object'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Code *</label>
                  <input value={editingObj?.code ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. ROOM_01" className="form-input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Label *</label>
                  <input value={editingObj?.label ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, label: e.target.value }))} placeholder="Display name" className="form-input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Type *</label>
                  <select value={editingObj?.objectType ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, objectType: e.target.value }))} className="form-input text-sm w-full">
                    <option value="">Select type…</option>
                    {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">SVG Element ID</label>
                  <input value={editingObj?.svgElementId ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, svgElementId: e.target.value || null }))} placeholder="id from SVG" className="form-input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Room ID</label>
                  <input value={editingObj?.roomId ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, roomId: e.target.value || null }))} placeholder="UUID" className="form-input text-sm w-full font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Locker ID</label>
                  <input value={editingObj?.lockerId ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, lockerId: e.target.value || null }))} placeholder="UUID" className="form-input text-sm w-full font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Access Zone ID</label>
                  <input value={editingObj?.accessZoneId ?? ''} onChange={(e) => setEditingObj((p) => ({ ...p, accessZoneId: e.target.value || null }))} placeholder="UUID" className="form-input text-sm w-full font-mono" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveObject} disabled={!editingObj?.code || !editingObj?.label || !editingObj?.objectType || busy} className="btn-primary text-sm disabled:opacity-40">
                  {busy ? 'Saving…' : 'Save Object'}
                </button>
                {editingObj && <button onClick={() => setEditingObj(null)} className="text-sm text-text-muted hover:text-text-primary">Cancel</button>}
              </div>
            </div>

            {!objects ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : objects.length === 0 ? (
              <p className="text-sm text-text-muted italic">No objects defined for this floor yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-muted border-b border-border-subtle">
                      <th className="text-left py-2 pr-3">Code</th>
                      <th className="text-left py-2 pr-3">Label</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">SVG ID</th>
                      <th className="text-left py-2 pr-3">State</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {objects.map((obj) => (
                      <tr key={obj.id} className="text-text-primary hover:bg-surface-2 transition-colors">
                        <td className="py-2 pr-3 font-mono text-xs">{obj.code}</td>
                        <td className="py-2 pr-3">{obj.label}</td>
                        <td className="py-2 pr-3 text-text-muted">{obj.objectType}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-text-muted">{obj.svgElementId ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${obj.active ? 'bg-success/20 text-success' : 'bg-surface-2 text-text-muted'}`}>
                            {obj.active ? 'active' : 'inactive'}
                          </span>
                        </td>
                        <td className="py-2 flex gap-2 justify-end">
                          <button onClick={() => { setEditingObj(obj); setTab('objects') }} className="text-xs text-accent-primary hover:underline">Edit</button>
                          <button onClick={() => deleteObject(obj)} className="text-xs text-critical hover:underline">Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!editingObj && (
              <button onClick={() => setEditingObj({ active: true })} className="text-sm text-accent-primary hover:underline">
                + Add object
              </button>
            )}
          </div>
        )}

        {/* ── AI Analysis Tab ────────────────────────────────── */}
        {tab === 'ai' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-text-primary">AI Floor Analysis</h3>
                <p className="text-xs text-text-muted mt-1">Analyses object bindings, naming consistency, and missing configurations.</p>
              </div>
              <button onClick={runAiAnalysis} disabled={busy} className="btn-primary text-sm disabled:opacity-40 flex-shrink-0">
                {busy ? 'Analysing…' : 'Run Analysis'}
              </button>
            </div>

            {aiAnalysis && (
              <div className="space-y-3">
                <div className="p-3 rounded border border-border-subtle bg-surface-2">
                  <p className="text-sm text-text-primary font-medium">{aiAnalysis.summary}</p>
                  <p className="text-xs text-text-muted mt-1">{aiAnalysis.objectCount} objects · analysed {fmt(aiAnalysis.analysedAt)}</p>
                </div>

                {aiAnalysis.suggestions.length === 0 ? (
                  <p className="text-sm text-green-300">No issues found — floor configuration looks good.</p>
                ) : (
                  <div className="space-y-2">
                    {aiAnalysis.suggestions.map((s, i) => (
                      <div key={i} className={`p-3 rounded border border-border-subtle ${severityClass[s.severity]}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono opacity-70 flex-shrink-0">{s.objectCode ?? 'floor'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{s.message}</p>
                            {s.suggestion && <p className="text-xs opacity-80 mt-1">→ {s.suggestion}</p>}
                          </div>
                          <span className="text-xs opacity-60 flex-shrink-0">{s.severity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
