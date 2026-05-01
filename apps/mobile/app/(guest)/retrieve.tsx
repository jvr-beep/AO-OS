import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { router } from 'expo-router'
import { getGuestBooking, BookingDetails } from '@/lib/guest-api'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const STATUS_LABELS: Record<string, string> = {
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export default function RetrieveScreen() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<BookingDetails | null>(null)

  async function lookup() {
    if (!code.trim()) return
    setLoading(true)
    setBooking(null)
    try {
      const result = await getGuestBooking(code.trim())
      setBooking(result)
    } catch (err: any) {
      Alert.alert('Not found', err.message ?? 'No booking found for that code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Find My Booking</Text>
        <Text style={styles.sub}>Enter your booking code to view your reservation.</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. AO-1A2B3C4D"
            placeholderTextColor="#444"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.lookupBtn, !code.trim() && styles.lookupBtnDisabled]}
            onPress={lookup}
            disabled={!code.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#0a0a0a" size="small" />
              : <Text style={styles.lookupBtnText}>Find</Text>}
          </TouchableOpacity>
        </View>

        {booking && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{STATUS_LABELS[booking.status] ?? booking.status}</Text>
              </View>
              <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
            </View>

            <View style={styles.qrCenter}>
              <QRCode
                value={booking.bookingCode}
                size={150}
                color="#c9a96e"
                backgroundColor="#111"
              />
            </View>

            <View style={styles.details}>
              <View style={styles.row}>
                <Text style={styles.key}>Experience</Text>
                <Text style={styles.val}>{booking.tierName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Duration</Text>
                <Text style={styles.val}>{formatDuration(booking.durationMinutes)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Arrival</Text>
                <Text style={styles.val}>{formatDate(booking.arrivalWindowStart)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Paid</Text>
                <Text style={styles.val}>{formatPrice(booking.paidAmountCents)}</Text>
              </View>
              {booking.balanceDueCents > 0 && (
                <View style={styles.row}>
                  <Text style={styles.key}>Balance due</Text>
                  <Text style={[styles.val, { color: '#e5a550' }]}>{formatPrice(booking.balanceDueCents)}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  headerRow: { marginBottom: 20 },
  back: { color: '#c9a96e', fontSize: 15 },
  title: { fontSize: 24, color: '#fff', fontWeight: '600', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 28 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  input: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
  },
  lookupBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  lookupBtnDisabled: { opacity: 0.4 },
  lookupBtnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  statusBadge: {
    backgroundColor: '#1a1508',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: { color: '#c9a96e', fontSize: 12, fontWeight: '600' },
  bookingCode: { fontSize: 16, color: '#fff', fontWeight: '700', letterSpacing: 2 },
  qrCenter: { alignItems: 'center', padding: 20, backgroundColor: '#0f0f0f' },
  details: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  key: { color: '#666', fontSize: 14 },
  val: { color: '#fff', fontSize: 14, fontWeight: '500' },
})
