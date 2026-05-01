import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { bookingState, TierDuration } from '@/lib/booking-state'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function getDateOptions(): { label: string; value: string }[] {
  const options = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const value = `${yyyy}-${mm}-${dd}`
    const label = i === 0
      ? 'Today'
      : i === 1
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    options.push({ label, value })
  }
  return options
}

// Tiers durations are loaded into bookingState by the tiers screen.
// We re-fetch catalog to get durations for selected tier — but to keep it simple,
// we store them in bookingState from the tiers screen.
// For now, accept that durations are in a separate catalog fetch;
// the tiers screen already has them, so we pass them via bookingState.durations.

export default function SelectScreen() {
  const [selectedDuration, setSelectedDuration] = useState<{
    durationMinutes: number
    priceCents: number
  } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const dates = getDateOptions()
  const durations: TierDuration[] = bookingState.durations

  function proceed() {
    if (!selectedDuration) return Alert.alert('Select a duration', 'Please choose how long your visit will be.')
    if (!selectedDate) return Alert.alert('Select a date', 'Please choose your arrival date.')
    bookingState.durationMinutes = selectedDuration.durationMinutes
    bookingState.priceCents = selectedDuration.priceCents
    bookingState.arrivalDate = selectedDate
    router.push('/(guest)/info')
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{bookingState.tierName}</Text>
          <Text style={styles.sub}>Choose your duration and arrival date</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationGrid}>
            {durations.map((d) => {
              const active = selectedDuration?.durationMinutes === d.durationMinutes
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.durationOption, active && styles.durationOptionActive]}
                  onPress={() => setSelectedDuration(d)}
                >
                  <Text style={[styles.durationLabel, active && styles.durationLabelActive]}>
                    {formatDuration(d.durationMinutes)}
                  </Text>
                  <Text style={[styles.durationPrice, active && styles.durationPriceActive]}>
                    {formatPrice(d.priceCents)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Arrival Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
            {dates.map((d) => {
              const active = selectedDate === d.value
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d.value)}
                >
                  <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {selectedDuration && selectedDate ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {formatDuration(selectedDuration.durationMinutes)} · {formatPrice(selectedDuration.priceCents)}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.btn, (!selectedDuration || !selectedDate) && styles.btnDisabled]}
          onPress={proceed}
          disabled={!selectedDuration || !selectedDate}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  back: { color: '#c9a96e', fontSize: 15, marginBottom: 20 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600', marginBottom: 6 },
  sub: { fontSize: 13, color: '#666', marginBottom: 8 },
  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionLabel: { fontSize: 12, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationOption: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 100,
  },
  durationOptionActive: { borderColor: '#c9a96e', backgroundColor: '#1a1508' },
  durationLabel: { fontSize: 15, color: '#ccc', fontWeight: '500' },
  durationLabelActive: { color: '#c9a96e' },
  durationPrice: { fontSize: 13, color: '#666', marginTop: 4 },
  durationPriceActive: { color: '#c9a96e' },
  dateRow: { flexDirection: 'row' },
  dateChip: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  dateChipActive: { borderColor: '#c9a96e', backgroundColor: '#1a1508' },
  dateLabel: { color: '#888', fontSize: 13 },
  dateLabelActive: { color: '#c9a96e' },
  footer: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#1a1a1a', gap: 12 },
  summary: { alignItems: 'center' },
  summaryText: { color: '#c9a96e', fontSize: 14 },
  btn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
})
