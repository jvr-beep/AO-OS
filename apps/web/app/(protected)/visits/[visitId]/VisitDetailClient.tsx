'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { GuestVisit, Folio } from '@/types/api'

export function VisitDetailClient({ token, visitId, staffUserId, okMessage, errorMessage }: { token: string; visitId: string; staffUserId?: string; okMessage?: string; errorMessage?: string }) {
  const router = useRouter()
  const [visit, setVisit] = useState<GuestVisit | null>(null)
  const [folio, setFolio] = useState<Folio | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    okMessage ? { text: okMessage, ok: true } : errorMessage ? { text: errorMessage, ok: false } : null
  )
  const [checkingOut, setCheckingOut] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)

  const load = () => {
    Promise.all([
      apiGet<GuestVisit>(`/visits/${visitId}`, token),
      apiGet<Folio>(`/visits/${visitId}/folio`, token).catch(() => null),
    ]).then(([v, f]) => {
      setVisit(v)
      setFolio(f)
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

  if (loading) return <div className="max-w-4xl"><p className="text-text-muted">Loading…</p></div>
  if (!visit) return <div className="max-w-4xl"><p className="text-red-400">Visit not found</p></div>

  const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Visit</h1>
          <p className="text-gray-400 text-xs font-mono">{visit.id}</p>
        </div>
        <div className="flex gap-2">
          {checkoutEligible && (
            <button onClick={checkout} disabled={checkingOut} className="btn-primary text-xs">{checkingOut ? '…' : 'Check Out'}</button>
          )}
          <Link href="/visits" className="btn-secondary text-xs">Back</Link>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-green-700 bg-green-900 text-green-200' : 'border-red-700 bg-red-900 text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Visit Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center"><dt className="text-gray-400">Status</dt><dd><StatusBadge status={visit.status} /></dd></div>
            <div className="flex justify-between items-center"><dt className="text-gray-400">Payment</dt><dd><StatusBadge status={visit.payment_status} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Source</dt><dd className="text-white">{visit.source_type}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Product Type</dt><dd className="text-white">{visit.product_type}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Duration</dt><dd className="text-white">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Check-in Channel</dt><dd className="text-white">{visit.check_in_channel ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Guest & Links</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Guest</dt>
              <dd><Link href={`/guests/${visit.guest_id}`} className="text-accent-primary hover:text-accent-primary font-mono text-xs">{visit.guest_id.slice(0, 8)}… →</Link></dd>
            </div>
            {visit.booking_id && <div className="flex justify-between"><dt className="text-gray-400">Booking</dt><dd className="text-xs font-mono text-gray-300">{visit.booking_id.slice(0, 8)}…</dd></div>}
            {visit.assigned_resource_id && <div className="flex justify-between"><dt className="text-gray-400">Resource</dt><dd className="text-xs font-mono text-gray-300">{visit.assigned_resource_id.slice(0, 8)}…</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-400">Started</dt><dd className="text-xs text-white">{visit.start_time ? new Date(visit.start_time).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Ended</dt><dd className="text-xs text-white">{visit.actual_end_time ? new Date(visit.actual_end_time).toLocaleString() : '—'}</dd></div>
          </dl>
        </div>
      </div>

      {folio && (
        <div className="card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Folio</h2>
            <div className="text-xs text-gray-400">
              Balance: <span className={folio.balance_due_cents > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>${(folio.balance_due_cents / 100).toFixed(2)}</span>
              {' · '}Due: ${(folio.total_due_cents / 100).toFixed(2)}
              {' · '}Paid: ${(folio.amount_paid_cents / 100).toFixed(2)}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Unit</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {folio.line_items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">No line items.</td></tr>
              ) : folio.line_items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-2 text-xs text-gray-400">{item.line_type}</td>
                  <td className="px-4 py-2 text-xs text-white">{item.description}</td>
                  <td className="px-4 py-2 text-xs text-gray-300 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-xs text-gray-300 text-right">${(item.unit_amount_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs text-white text-right">${(item.total_amount_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {folio.payment_transactions.length > 0 && (
            <div className="border-t border-gray-700 px-4 py-3">
              <p className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-2">Payments</p>
              {folio.payment_transactions.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>{p.payment_provider} · {p.transaction_type}</span>
                  <span className="text-green-400">${(p.amount_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {folio.balance_due_cents > 0 && (
            <div className="border-t border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-300 mb-2">Record Payment</p>
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

          <div className="border-t border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-300 mb-2">Add Line Item</p>
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
    </div>
  )
}
