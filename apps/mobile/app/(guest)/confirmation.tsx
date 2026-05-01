import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { router } from 'expo-router'
import { bookingState, clearBookingState } from '@/lib/booking-state'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatWindow(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return s.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ConfirmationScreen() {
  const {
    bookingCode,
    arrivalWindowStart,
    arrivalWindowEnd,
    tierName,
    durationMinutes,
    paidAmountCents,
  } = bookingState

  async function shareBooking() {
    await Share.share({
      message: `My AO Sanctuary booking code is ${bookingCode}. See you there!`,
    })
  }

  function done() {
    clearBookingState()
    router.replace('/(auth)/welcome')
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.successBadge}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.title}>You're booked!</Text>
        <Text style={styles.sub}>Show this code when you arrive at AO Sanctuary.</Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>BOOKING CODE</Text>
          <Text style={styles.code}>{bookingCode}</Text>
        </View>

        <View style={styles.qrWrapper}>
          <QRCode
            value={bookingCode}
            size={180}
            color="#c9a96e"
            backgroundColor="#0f0f0f"
          />
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsLabel}>VISIT DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Experience</Text>
            <Text style={styles.detailVal}>{tierName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Duration</Text>
            <Text style={styles.detailVal}>{formatDuration(durationMinutes)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Arrival Date</Text>
            <Text style={styles.detailVal}>{formatWindow(arrivalWindowStart, arrivalWindowEnd)}</Text>
          </View>
          {paidAmountCents > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Paid</Text>
              <Text style={styles.detailVal}>{formatPrice(paidAmountCents)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.note}>
          Save your booking code. You can look it up anytime by entering it at the kiosk or in the app.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={shareBooking}>
          <Text style={styles.shareBtnText}>Share Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={done}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 24, paddingBottom: 120 },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1508',
    borderWidth: 2,
    borderColor: '#c9a96e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: { fontSize: 32, color: '#c9a96e' },
  title: { fontSize: 28, color: '#fff', fontWeight: '600', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, maxWidth: 260 },
  codeBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  codeLabel: { fontSize: 11, color: '#555', letterSpacing: 3, marginBottom: 8 },
  code: { fontSize: 32, color: '#c9a96e', fontWeight: '700', letterSpacing: 4 },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 28,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
    marginBottom: 20,
  },
  detailsLabel: { fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { color: '#666', fontSize: 14 },
  detailVal: { color: '#fff', fontSize: 14, fontWeight: '500' },
  note: { fontSize: 12, color: '#444', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
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
    gap: 10,
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: { color: '#c9a96e', fontSize: 15, fontWeight: '600' },
  doneBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
})
