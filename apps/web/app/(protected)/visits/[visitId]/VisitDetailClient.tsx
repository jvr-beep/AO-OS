'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPost, apiPatch } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { GuestVisit, Folio } from '@/types/api'

interface VisitNote {
  id: string
  visitId: string
  staffUserId: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export function VisitDetailClient({ token, visitId, staffUserId, okMessage, errorMessage }: { token: string; visitId: string; staffUserId?: string; okMessage?: string; errorMessage?: string }) {
  const [visit, setVisit] = useState<GuestVisit | null>(null)
  const [folio, setFolio] = useState<Folio | null>(null)
  const [notes, setNotes] = useState<VisitNote[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    okMessage ? { text: okMessage, ok: true } : errorMessage ? { text: errorMessage, ok: false } : null
  )
  const [checkingOut, setCheckingOut] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteBody, setEditingNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = () => {
    Promise.all([
      apiGet<GuestVisit>(`/visits/${visitId}`, token),
      apiGet<Folio>(`/visits/${visitId}/folio`, token).catch(() => null),
      apiGet<VisitNote[]>(`/visits/${visitId}/notes`, token).catch(() => [] as VisitNote[]),
    ]).then(([v, f, n]) => {
      setVisit(v)
      setFolio(f)
      setNotes(n)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [visitId, token])

  const checkout = async () => {
    setCheckingOut(true)
    setMessage(null)
    try {
      await apiPost('/orchestrators/checkout', { visit_id: visitId, check_out_channel: 'staff', changed_by_user_id: staffUserId }, token)
      setMessage({ text: 'Guest checked out', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Checkout failed', ok: false })
    } finally {
      setCheckingOut(false)
    }
  }

  const handleAddLineItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!folio) return
    const fd = new FormData(e.currentTarget)
    setAddingItem(true)
    setMessage(null)
    try {
      await apiPost(`/folios/${folio.id}/line-items`, {
        line_type: fd.get('lineType'), description: fd.get('description'),
        quantity: parseInt(fd.get('quantity') as string || '1', 10),
        unit_amount_cents: parseInt(fd.get('unitAmountCents') as string, 10),
      }, token)
      setMessage({ text: 'Line item added', ok: true })
      load()
      e.currentTarget.reset()
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Add line item failed', ok: false })
    } finally {
      setAddingItem(false)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!folio) return
    const fd = new FormData(e.currentTarget)
    setRecordingPayment(true)
    setMessage(null)
    try {
      await apiPost(`/folios/${folio.id}/payments`, {
        payment_provider: fd.get('paymentProvider'), transaction_type: 'sale',
        amount_cents: parseInt(fd.get('amountCents') as string, 10), status: 'succeeded',
      }, token)
      setMessage({ text: 'Payment recorded', ok: true })
      load()
      e.currentTarget.reset()
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Record payment failed', ok: false })
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteBody.trim()) return
    setAddingNote(true)
    try {
      const note = await apiPost<VisitNote>(`/visits/${visitId}/notes`, { body: noteBody.trim() }, token)
      setNotes((prev) => [note, ...prev])
      setNoteBody('')
    } catch {
      // note add failed silently — user can retry
    } finally {
      setAddingNote(false)
    }
  }

  const handleSaveNoteEdit = async (noteId: string) => {
    if (!editingNoteBody.trim()) return
    setSavingNote(true)
    try {
      const updated = await apiPatch<VisitNote>(`/visits/${visitId}/notes/${noteId}`, { body: editingNoteBody.trim() }, token)
      setNotes((prev) => prev.map((n) => n.id === noteId ? updated : n))
      setEditingNoteId(null)
    } catch {
      // edit failed silently
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <div className="max-w-4xl"><p className="text-text-muted">Loading…</p></div>
  if (!visit) return <div className="max-w-4xl"><p className="text-critical">Visit not found</p></div>

  const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Visit</h1>
          <p className="text-text-muted text-xs font-mono">{visit.id}</p>
        </div>
        <div className="flex gap-2">
          {checkoutEligible && (
            <button onClick={checkout} disabled={checkingOut} className="btn-primary text-xs">{checkingOut ? '…' : 'Check Out'}</button>
          )}
          <Link href="/visits" className="btn-secondary text-xs">Back</Link>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Visit Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center"><dt className="text-text-muted">Status</dt><dd><StatusBadge status={visit.status} /></dd></div>
            <div className="flex justify-between items-center"><dt className="text-text-muted">Payment</dt><dd><StatusBadge status={visit.payment_status} /></dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Source</dt><dd className="text-text-primary">{visit.source_type}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Product Type</dt><dd className="text-text-primary">{visit.product_type}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Duration</dt><dd className="text-text-primary">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Check-in Channel</dt><dd className="text-text-primary">{visit.check_in_channel ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Guest & Links</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Guest</dt>
              <dd><Link href={`/guests/${visit.guest_id}`} className="text-accent-primary hover:text-accent-primary font-mono text-xs">{visit.guest_id.slice(0, 8)}… →</Link></dd>
            </div>
            {visit.booking_id && <div className="flex justify-between"><dt className="text-text-muted">Booking</dt><dd className="text-xs font-mono text-text-muted">{visit.booking_id.slice(0, 8)}…</dd></div>}
            {visit.assigned_resource_id && <div className="flex justify-between"><dt className="text-text-muted">Resource</dt><dd className="text-xs font-mono text-text-muted">{visit.assigned_resource_id.slice(0, 8)}…</dd></div>}
            <div className="flex justify-between"><dt className="text-text-muted">Started</dt><dd className="text-xs text-text-primary">{visit.start_time ? new Date(visit.start_time).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Ended</dt><dd className="text-xs text-text-primary">{visit.actual_end_time ? new Date(visit.actual_end_time).toLocaleString() : '—'}</dd></div>
          </dl>
        </div>
      </div>

      {folio && (
        <div className="card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Folio</h2>
            <div className="text-xs text-text-muted">
              Balance: <span className={folio.balance_due_cents > 0 ? 'text-critical font-semibold' : 'text-success font-semibold'}>${(folio.balance_due_cents / 100).toFixed(2)}</span>
              {' · '}Due: ${(folio.total_due_cents / 100).toFixed(2)}
              {' · '}Paid: ${(folio.amount_paid_cents / 100).toFixed(2)}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Unit</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {folio.line_items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-text-muted">No line items.</td></tr>
              ) : folio.line_items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-1/50 transition-colors">
                  <td className="px-4 py-2 text-xs text-text-muted">{item.line_type}</td>
                  <td className="px-4 py-2 text-xs text-text-primary">{item.description}</td>
                  <td className="px-4 py-2 text-xs text-text-muted text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-xs text-text-muted text-right">${(item.unit_amount_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs text-text-primary text-right">${(item.total_amount_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {folio.payment_transactions.length > 0 && (
            <div className="border-t border-border-subtle px-4 py-3">
              <p className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-2">Payments</p>
              {folio.payment_transactions.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-text-muted mb-1">
                  <span>{p.payment_provider} · {p.transaction_type}</span>
                  <span className="text-success">${(p.amount_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {folio.balance_due_cents > 0 && (
            <div className="border-t border-border-subtle p-4">
              <p className="text-xs font-semibold text-text-muted mb-2">Record Payment</p>
              <form onSubmit={handleRecordPayment} className="flex flex-wrap gap-2">
                <select name="paymentProvider" className="form-input text-xs">
                  <option value="cash">cash</option>
                  <option value="card">card</option>
                  <option value="stripe">stripe</option>
                </select>
                <input name="amountCents" type="number" placeholder="Amount (cents)" defaultValue={folio.balance_due_cents} className="form-input text-xs w-40" required />
                <button disabled={recordingPayment} className="btn-primary text-xs">{recordingPayment ? '…' : 'Record Payment'}</button>
              </form>
            </div>
          )}

          <div className="border-t border-border-subtle p-4">
            <p className="text-xs font-semibold text-text-muted mb-2">Add Line Item</p>
            <form onSubmit={handleAddLineItem} className="flex flex-wrap gap-2">
              <select name="lineType" className="form-input text-xs">
                <option value="add_on">add_on</option>
                <option value="adjustment">adjustment</option>
                <option value="fee">fee</option>
              </select>
              <input name="description" placeholder="Description" className="form-input text-xs flex-1" required />
              <input name="unitAmountCents" type="number" placeholder="Amount (cents)" className="form-input text-xs w-36" required />
              <button disabled={addingItem} className="btn-primary text-xs">{addingItem ? '…' : 'Add'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Staff Notes ({notes.length})</h2>
        </div>

        <div className="p-4 border-b border-border-subtle">
          <form onSubmit={handleAddNote} className="flex gap-2 items-end">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              className="flex-1 bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary resize-none"
            />
            <button
              type="submit"
              disabled={addingNote || !noteBody.trim()}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-50 self-end"
            >
              {addingNote ? '…' : 'Add'}
            </button>
          </form>
        </div>

        <div className="divide-y divide-border-subtle">
          {notes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No notes yet.</p>
          ) : notes.map((note) => (
            <div key={note.id} className="px-4 py-3">
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingNoteBody}
                    onChange={(e) => setEditingNoteBody(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNoteEdit(note.id)}
                      disabled={savingNote || !editingNoteBody.trim()}
                      className="btn-primary text-xs py-1 px-3 disabled:opacity-50"
                    >
                      {savingNote ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingNoteId(null)}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-primary whitespace-pre-wrap">{note.body}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.staffUserId && ` · ${note.staffUserId.slice(0, 8)}…`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingNoteId(note.id); setEditingNoteBody(note.body) }}
                    className="text-xs text-text-muted hover:text-text-primary shrink-0"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
