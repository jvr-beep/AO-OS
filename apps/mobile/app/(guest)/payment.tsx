import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useStripe } from '@stripe/stripe-react-native'
import { createBookingPaymentIntent, confirmGuestBooking, identifyGuest } from '@/lib/guest-api'
import { bookingState } from '@/lib/booking-state'

async function ensureFreshToken(): Promise<void> {
  try {
    const payload = JSON.parse(
      Buffer.from(bookingState.guestToken.split('.')[0], 'base64url').toString()
    )
    const expiresAt = payload.exp * 1000
    if (Date.now() > expiresAt - 3 * 60 * 1000) {
      const result = await identifyGuest({
        firstName: bookingState.guestFirstName || 'Guest',
        email: bookingState.guestEmail || undefined,
        phone: bookingState.guestPhone || undefined,
      })
      bookingState.guestId = result.guestId
      bookingState.guestToken = result.guestToken
    }
  } catch {
    // Proceed — API will 401 if truly expired
  }
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default function PaymentScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [amountCents, setAmountCents] = useState(0)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    initiate()
  }, [])

  async function initiate() {
    try {
      await ensureFreshToken()
      const result = await createBookingPaymentIntent(bookingState.guestToken, {
        tierId: bookingState.tierId,
        durationMinutes: bookingState.durationMinutes,
        productType: bookingState.productType,
      })

      setPaymentIntentId(result.paymentIntentId)
      setAmountCents(result.amountCents)
      setOffline(result.offline ?? false)

      if (result.clientSecret) {
        const { error } = await initPaymentSheet({
          paymentIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'AO Sanctuary',
          style: 'alwaysDark',
          appearance: {
            colors: {
              primary: '#c9a96e',
              background: '#0a0a0a',
              componentBackground: '#111',
              componentBorder: '#2a2a2a',
              componentDivider: '#1a1a1a',
              primaryText: '#ffffff',
              secondaryText: '#888888',
              componentText: '#ffffff',
              placeholderText: '#555555',
              icon: '#c9a96e',
            },
          },
        })
        if (error) throw new Error(error.message)
      }
    } catch (err: any) {
      Alert.alert('Payment setup failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    if (offline) {
      // Zero-price or offline mode — confirm directly
      await confirmBooking(null)
      return
    }
    setProcessing(true)
    try {
      const { error } = await presentPaymentSheet()
      if (error) {
        if (error.code !== 'Canceled') {
          Alert.alert('Payment failed', error.message)
        }
        return
      }
      await confirmBooking(paymentIntentId)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function confirmBooking(piId: string | null) {
    setProcessing(true)
    try {
      const booking = await confirmGuestBooking(bookingState.guestToken, {
        paymentIntentId: piId,
        tierId: bookingState.tierId,
        durationMinutes: bookingState.durationMinutes,
        productType: bookingState.productType,
        arrivalDate: bookingState.arrivalDate,
      })
      bookingState.bookingCode = booking.bookingCode
      bookingState.arrivalWindowStart = booking.arrivalWindowStart
      bookingState.arrivalWindowEnd = booking.arrivalWindowEnd
      bookingState.paidAmountCents = booking.paidAmountCents
      router.replace('/(guest)/confirmation')
    } catch (err: any) {
      Alert.alert('Booking failed', err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
        <Text style={styles.loadingText}>Preparing payment...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16} disabled={processing}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Complete Booking</Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>BOOKING SUMMARY</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Experience</Text>
          <Text style={styles.summaryVal}>{bookingState.tierName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Duration</Text>
          <Text style={styles.summaryVal}>{formatDuration(bookingState.durationMinutes)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Arrival Date</Text>
          <Text style={styles.summaryVal}>{formatDate(bookingState.arrivalDate)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalKey}>Total</Text>
          <Text style={styles.summaryTotalVal}>{formatPrice(amountCents)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.secureNote}>🔒 Secured by Stripe · Charges appear as "AO Sanctuary"</Text>
        <TouchableOpacity
          style={[styles.payBtn, processing && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={processing}
        >
          {processing
            ? <ActivityIndicator color="#0a0a0a" />
            : <Text style={styles.payBtnText}>Pay {formatPrice(amountCents)}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', gap: 16 },
  loadingText: { color: '#555', fontSize: 14 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  back: { color: '#c9a96e', fontSize: 15, marginBottom: 20 },
  title: { fontSize: 24, color: '#fff', fontWeight: '600' },
  summary: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 14,
  },
  summaryLabel: { fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { color: '#888', fontSize: 14 },
  summaryVal: { color: '#fff', fontSize: 14, fontWeight: '500' },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 14,
    marginTop: 4,
  },
  summaryTotalKey: { color: '#ccc', fontSize: 16, fontWeight: '600' },
  summaryTotalVal: { color: '#c9a96e', fontSize: 20, fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  secureNote: { color: '#444', fontSize: 12, textAlign: 'center' },
  payBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#0a0a0a', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
})
