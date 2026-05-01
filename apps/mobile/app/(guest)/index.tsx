import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function GuestIndexScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        <Text style={styles.logo}>ΑΩ</Text>
        <Text style={styles.title}>Book Your Visit</Text>
        <Text style={styles.sub}>
          Choose a tier, select your duration, and complete payment to secure your spot.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(guest)/tiers')}>
          <Text style={styles.primaryBtnText}>Browse Tiers & Pricing</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  back: { color: '#c9a96e', fontSize: 15 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  logo: { fontSize: 56, color: '#c9a96e', fontWeight: '200', letterSpacing: 4, marginBottom: 20 },
  title: { fontSize: 26, color: '#fff', fontWeight: '300', letterSpacing: 2, marginBottom: 14, textAlign: 'center' },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 40, maxWidth: 280 },
  primaryBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
})
