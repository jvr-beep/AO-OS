'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TierDurationOption {
  id: string
  durationMinutes: number
  priceCents: number
  active?: boolean
}

interface Tier {
  id: string
  code: string
  name: string
  publicDescription: string | null
  productType: string
  upgradeRank: number
  basePriceCents: number
  active?: boolean
  durationOptions: TierDurationOption[]
}

type Step = 'tier' | 'datetime' | 'confirm' | 'done'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function buildArrivalWindow(dateStr: string, timeStr: string): { start: string; end: string } {
  const base = new Date(`${dateStr}T${timeStr}:00`)
  const end = new Date(base.getTime() + 30 * 60 * 1000)
  return { start: base.toISOString(), end: end.toISOString() }
}

export function BookClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('tier')
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<TierDurationOption | null>(null)
  const [bookingDate, setBookingDate] = useState(todayIso())
  const [arrivalTime, setArrivalTime] = useState('10:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingCode, setBookingCode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/member/tiers')
      .then((r) => r.json())
      .then((data: Tier[]) => setTiers(data.filter((t) => t.active !== false)))
      .catch(() => setTiers([]))
      .finally(() => setLoadingTiers(false))
  }, [])

  function selectTier(tier: Tier) {
    setSelectedTier(tier)
    const defaultDuration = tier.durationOptions.find((d) => d.active !== false) ?? tier.durationOptions[0] ?? null
    setSelectedDuration(defaultDuration)
    setStep('datetime')
  }

  async function submit() {
    if (!selectedTier || !selectedDuration) return
    setSubmitting(true)
    setError(null)
    const { start, end } = buildArrivalWindow(bookingDate, arrivalTime)
    try {
      const res = await fetch('/api/member/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: selectedTier.id,
          duration_minutes: selectedDuration.durationMinutes,
          booking_date: bookingDate,
          arrival_window_start: start,
          arrival_window_end: end,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? 'Booking failed')
      setBookingCode(data.booking_code)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done' && bookingCode) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 space-y-4">
          <p className="text-xs text-text-muted uppercase tracking-widest">Booking confirmed</p>
          <p className="text-3xl font-heading tracking-widest text-accent-primary">{bookingCode}</p>
          <p className="text-xs text-text-muted">Present this code at the front desk on arrival.</p>
          {selectedTier && selectedDuration && (
            <div className="text-sm text-text-secondary space-y-1 pt-2 border-t border-border-subtle">
              <p>{selectedTier.name} — {formatDuration(selectedDuration.durationMinutes)}</p>
              <p>{new Date(bookingDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p>Arrival around {arrivalTime}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/member/bookings')} className="flex-1 rounded bg-surface-1 border border-border-subtle text-xs uppercase tracking-widest text-text-muted py-3 hover:border-accent-primary transition-colors">
            My Bookings
          </button>
          <button onClick={() => router.push('/member')} className="flex-1 rounded bg-accent-primary text-xs uppercase tracking-widest text-white py-3 hover:opacity-90 transition-opacity">
            Home
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirm' && selectedTier && selectedDuration) {
    const { start } = buildArrivalWindow(bookingDate, arrivalTime)
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Step 3 of 3</p>
          <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary">Confirm</h2>
        </div>

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Experience</span>
            <span className="text-text-primary">{selectedTier.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Duration</span>
            <span className="text-text-primary">{formatDuration(selectedDuration.durationMinutes)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Date</span>
            <span className="text-text-primary">{new Date(bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Arrival</span>
            <span className="text-text-primary">{new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="border-t border-border-subtle pt-3 flex justify-between font-medium">
            <span className="text-text-muted">Total</span>
            <span className="text-text-primary">{formatPrice(selectedDuration.priceCents)}</span>
          </div>
        </div>

        <p className="text-xs text-text-muted">Payment is collected at the facility. This booking holds your spot.</p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => setStep('datetime')} className="flex-1 rounded bg-surface-1 border border-border-subtle text-xs uppercase tracking-widest text-text-muted py-3 hover:border-accent-primary transition-colors">
            Back
          </button>
          <button onClick={submit} disabled={submitting} className="flex-1 rounded bg-accent-primary text-xs uppercase tracking-widest text-white py-3 hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'datetime' && selectedTier) {
    const activeDurations = selectedTier.durationOptions.filter((d) => (d as any).active !== false)
    const minDate = todayIso()

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Step 2 of 3</p>
          <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary">Date & Duration</h2>
          <p className="text-xs text-text-muted mt-1">{selectedTier.name}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Visit Date</label>
            <input
              type="date"
              min={minDate}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Arrival Time</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full bg-surface-1 border border-border-subtle text-text-primary rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          {activeDurations.length > 0 && (
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {activeDurations.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDuration(opt)}
                    className={`rounded border p-3 text-left transition-colors ${
                      selectedDuration?.id === opt.id
                        ? 'border-accent-primary bg-surface-2'
                        : 'border-border-subtle bg-surface-1 hover:border-accent-primary'
                    }`}
                  >
                    <p className="text-sm font-medium text-text-primary">{formatDuration(opt.durationMinutes)}</p>
                    <p className="text-xs text-text-muted">{formatPrice(opt.priceCents)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep('tier')} className="flex-1 rounded bg-surface-1 border border-border-subtle text-xs uppercase tracking-widest text-text-muted py-3 hover:border-accent-primary transition-colors">
            Back
          </button>
          <button
            onClick={() => setStep('confirm')}
            disabled={!selectedDuration || !bookingDate}
            className="flex-1 rounded bg-accent-primary text-xs uppercase tracking-widest text-white py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // Step: tier selection
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Step 1 of 3</p>
        <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary">Choose Experience</h2>
      </div>

      {loadingTiers ? (
        <p className="text-xs text-text-muted">Loading experiences…</p>
      ) : tiers.length === 0 ? (
        <p className="text-xs text-text-muted">No experiences available. Please contact front desk.</p>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => selectTier(tier)}
              className="w-full text-left rounded-lg bg-surface-1 border border-border-subtle p-5 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-primary uppercase tracking-wide">{tier.name}</h3>
                <span className="text-xs text-text-muted">{formatPrice(tier.basePriceCents)}+</span>
              </div>
              {tier.publicDescription && (
                <p className="text-xs text-text-muted">{tier.publicDescription}</p>
              )}
              {tier.durationOptions.length > 0 && (
                <p className="text-xs text-text-muted mt-2">
                  {tier.durationOptions.map((d) => formatDuration(d.durationMinutes)).join(' · ')}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
