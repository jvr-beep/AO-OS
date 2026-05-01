import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { getGuestCatalog, CatalogTier } from '@/lib/guest-api'
import { bookingState } from '@/lib/booking-state'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function TiersScreen() {
  const [tiers, setTiers] = useState<CatalogTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGuestCatalog()
      .then(setTiers)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false))
  }, [])

  function selectTier(tier: CatalogTier) {
    bookingState.tierId = tier.id
    bookingState.tierCode = tier.code
    bookingState.tierName = tier.name
    bookingState.productType = tier.productType
    bookingState.basePriceCents = tier.basePriceCents
    bookingState.durations = tier.durations
    router.push('/(guest)/select')
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Experience</Text>
        <Text style={styles.sub}>Select a tier to see available durations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tiers.map((tier) => (
          <TouchableOpacity key={tier.id} style={styles.card} onPress={() => selectTier(tier)}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierType}>{tier.productType === 'room' ? 'Private Room' : 'Locker'}</Text>
              </View>
              <Text style={styles.tierPrice}>from {formatPrice(tier.basePriceCents)}</Text>
            </View>

            {tier.publicDescription ? (
              <Text style={styles.tierDesc}>{tier.publicDescription}</Text>
            ) : null}

            <View style={styles.durations}>
              {tier.durations.slice(0, 4).map((d) => (
                <View key={d.id} style={styles.durationChip}>
                  <Text style={styles.durationChipText}>{formatDuration(d.durationMinutes)}</Text>
                  <Text style={styles.durationChipPrice}>{formatPrice(d.priceCents)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.cardCta}>Select →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  back: { color: '#c9a96e', fontSize: 15, marginBottom: 20 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600', marginBottom: 6 },
  sub: { fontSize: 13, color: '#666' },
  list: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 20,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tierName: { fontSize: 18, color: '#fff', fontWeight: '600' },
  tierType: { fontSize: 12, color: '#666', marginTop: 2 },
  tierPrice: { fontSize: 16, color: '#c9a96e', fontWeight: '600' },
  tierDesc: { fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 14 },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  durationChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
  },
  durationChipText: { color: '#ccc', fontSize: 13 },
  durationChipPrice: { color: '#c9a96e', fontSize: 13 },
  cardCta: { color: '#c9a96e', fontSize: 13, textAlign: 'right' },
})
