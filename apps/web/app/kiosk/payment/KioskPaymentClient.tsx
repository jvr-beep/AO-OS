'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface KioskPaymentClientProps {
  clientSecret: string
  visitId: string
  amountCents: number
}

// ── Inner form (must be inside <Elements>) ───────────────────────────────────

function PaymentForm({ amountCents }: { amountCents: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Validation error')
      setLoading(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/kiosk/assign`,
      },
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setLoading(false)
    }
    // On success Stripe redirects to /kiosk/assign automatically
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-surface-1 border border-border-subtle p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-center text-critical">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full btn-primary py-4 text-sm uppercase tracking-widest disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${(amountCents / 100).toFixed(2)} CAD`}
      </button>
    </form>
  )
}

// ── Stripe appearance matching AO brand tokens ───────────────────────────────

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#2F8F83',
    colorBackground: '#181C21',
    colorText: '#EDE9E3',
    colorTextSecondary: '#8A8680',
    colorDanger: '#E57373',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
  },
}

// ── Outer wrapper — loads Stripe, mounts Elements ───────────────────────────

export function KioskPaymentClient({ clientSecret, visitId, amountCents }: KioskPaymentClientProps) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const stripeRef = useRef<Promise<Stripe | null> | null>(null)

  if (!publishableKey) {
    return (
      <div className="rounded-lg bg-surface-1 border border-warning p-5 text-center space-y-2">
        <p className="text-xs text-warning uppercase tracking-wider">Payment not configured</p>
        <p className="text-xs text-text-muted">
          Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable payments.
        </p>
      </div>
    )
  }

  if (!stripeRef.current) {
    stripeRef.current = loadStripe(publishableKey)
  }

  return (
    <Elements
      stripe={stripeRef.current}
      options={{
        clientSecret,
        appearance: STRIPE_APPEARANCE,
      }}
    >
      <PaymentForm amountCents={amountCents} />
    </Elements>
  )
}
