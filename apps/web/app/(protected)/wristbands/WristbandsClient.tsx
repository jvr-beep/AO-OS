'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Wristband } from '@/types/api'

export function WristbandsClient({ token, role }: { token: string; role?: string }) {
  const [wristbands, setWristbands] = useState<Wristband[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyRowId, setBusyRowId] = useState<string | null>(null)

  const canManage = role === 'operations' || role === 'admin'
  const canActivate = role === 'front_desk' || role === 'operations' || role === 'admin'

  const load = () => {
    setLoading(true)
    apiGet<Wristband[]>('/wristbands', token)
      .then(setWristbands)
      .catch(() => setWristbands([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const mutate = async (path: string, body: Record<string, string>, successMsg: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await apiPost(path, body, token)
      setMessage({ text: successMsg, ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Action failed', ok: false })
    } finally {
      setBusy(false)
    }
  }

  const handleIssue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutate('/wristbands/issue', { uid: fd.get('uid') as string, memberId: fd.get('memberId') as string }, 'Credential issued')
    e.currentTarget.reset()
  }
  const handleActivate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutate('/wristbands/activate', { credentialId: fd.get('credentialId') as string }, 'Credential activated')
    e.currentTarget.reset()
  }
  const handleSuspend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutate('/wristbands/suspend', { credentialId: fd.get('credentialId') as string }, 'Credential suspended')
    e.currentTarget.reset()
  }
  const handleReplace = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutate('/wristbands/replace', { oldCredentialId: fd.get('oldCredentialId') as string, newCredentialUid: fd.get('newCredentialUid') as string }, 'Credential replaced')
    e.currentTarget.reset()
  }

  const rowAction = async (wristbandId: string, path: string, body: Record<string, string>, msg: string) => {
    setBusyRowId(wristbandId)
    setMessage(null)
    try {
      await apiPost(path, body, token)
      setMessage({ text: msg, ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Action failed', ok: false })
    } finally {
      setBusyRowId(null)
    }
  }

  const filtered = query
    ? wristbands.filter((wb) => {
        const q = query.toLowerCase()
        return wb.uid.toLowerCase().includes(q) || wb.status.toLowerCase().includes(q) || (wb.memberId?.toLowerCase() ?? '').includes(q) || wb.id.toLowerCase().includes(q)
      })
    : wristbands

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Wristbands</h1>
      <p className="text-text-muted mb-6">Credential lifecycle management</p>

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Issue Credential</h2>
          <p className="text-xs text-text-muted mb-3">Allowed roles: operations, admin.</p>
          <form onSubmit={handleIssue} className="space-y-3">
            <input name="uid" placeholder="New wristband UID" className="form-input" required />
            <input name="memberId" placeholder="Member ID" className="form-input" required />
            <button disabled={!canManage || busy} className={!canManage ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}>Issue</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Activate Credential</h2>
          <p className="text-xs text-text-muted mb-3">Allowed roles: front_desk, operations, admin.</p>
          <form onSubmit={handleActivate} className="space-y-3">
            <input name="credentialId" placeholder="Credential ID" className="form-input" required />
            <button disabled={!canActivate || busy} className={!canActivate ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}>Activate</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Suspend Credential</h2>
          <p className="text-xs text-text-muted mb-3">Allowed roles: operations, admin.</p>
          <form onSubmit={handleSuspend} className="space-y-3">
            <input name="credentialId" placeholder="Credential ID" className="form-input" required />
            <button disabled={!canManage || busy} className={!canManage ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}>Suspend</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Replace Credential</h2>
          <p className="text-xs text-text-muted mb-3">Allowed roles: operations, admin.</p>
          <form onSubmit={handleReplace} className="space-y-3">
            <input name="oldCredentialId" placeholder="Old credential ID" className="form-input" required />
            <input name="newCredentialUid" placeholder="New wristband UID" className="form-input" required />
            <button disabled={!canManage || busy} className={!canManage ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}>Replace</button>
          </form>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by UID, status, member ID, or wristband ID" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-surface-0">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">UID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No wristbands found.</td></tr>
            ) : filtered.map((wb) => {
              const isRowBusy = busyRowId === wb.id
              return (
                <tr key={wb.id} className="hover:bg-surface-1/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-primary">{wb.uid}</td>
                  <td className="px-4 py-3"><StatusBadge status={wb.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{wb.memberId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(wb.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {wb.status === 'pending_activation' && canActivate && (
                        <button onClick={() => rowAction(wb.id, '/wristbands/activate', { credentialId: wb.id }, 'Activated')} disabled={isRowBusy} className="btn-primary text-xs px-2 py-1">{isRowBusy ? '…' : 'Activate'}</button>
                      )}
                      {wb.status === 'active' && canManage && (
                        <button onClick={() => rowAction(wb.id, '/wristbands/suspend', { credentialId: wb.id }, 'Suspended')} disabled={isRowBusy} className="text-xs px-2 py-1 rounded bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30 transition-colors">{isRowBusy ? '…' : 'Suspend'}</button>
                      )}
                      {wb.status === 'suspended' && canManage && (
                        <button onClick={() => rowAction(wb.id, '/wristbands/activate', { credentialId: wb.id }, 'Reactivated')} disabled={isRowBusy} className="btn-primary text-xs px-2 py-1">{isRowBusy ? '…' : 'Reactivate'}</button>
                      )}
                      {!['pending_activation', 'active', 'suspended'].includes(wb.status) && <span className="text-xs text-text-muted">—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
