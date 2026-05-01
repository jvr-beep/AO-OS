import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { clearBookingState } from '@/lib/booking-state'

export default function WelcomeScreen() {
  function handleGuestBook() {
    clearBookingState()
    router.push('/(guest)/')
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>ΑΩ</Text>
        <Text style={styles.name}>AO Sanctuary</Text>
        <Text style={styles.tagline}>RESTORE · RELEASE · RETREAT</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGuestBook}>
            <Text style={styles.primaryBtnText}>Book a Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.secondaryBtnText}>Member Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Already have a booking?</Text>
        <TouchableOpacity onPress={() => router.push('/(guest)/retrieve')}>
          <Text style={styles.hintLink}>Find my booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 72,
    color: '#c9a96e',
    fontWeight: '200',
    letterSpacing: 6,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 10,
    color: '#555',
    letterSpacing: 4,
    marginBottom: 56,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  hint: { fontSize: 13, color: '#555', marginBottom: 6 },
  hintLink: { fontSize: 13, color: '#c9a96e', textDecorationLine: 'underline' },
})
