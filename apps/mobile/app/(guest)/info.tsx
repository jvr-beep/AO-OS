import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { identifyGuest } from '@/lib/guest-api'
import { bookingState } from '@/lib/booking-state'

export default function InfoScreen() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const canProceed = firstName.trim() && (email.trim() || phone.trim())

  async function proceed() {
    if (!canProceed) return
    setLoading(true)
    try {
      const result = await identifyGuest({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      bookingState.guestId = result.guestId
      bookingState.guestToken = result.guestToken
      bookingState.guestFirstName = firstName.trim()
      bookingState.guestEmail = email.trim()
      bookingState.guestPhone = phone.trim()
      router.push('/(guest)/waiver')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not continue. Please try again.')
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

        <Text style={styles.title}>Your Details</Text>
        <Text style={styles.sub}>
          We'll use this to look up your booking when you arrive.
        </Text>

        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="First name *"
              placeholderTextColor="#555"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              textContentType="givenName"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Last name"
              placeholderTextColor="#555"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number *"
            placeholderTextColor="#555"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />

          <Text style={styles.hint}>* Email or phone required</Text>
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyText}>
            By continuing you agree to our{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://aosanctuary.com/privacy')}>Privacy Policy</Text>
            {' '}and{' '}
            <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://aosanctuary.com/terms')}>Terms of Service</Text>.
            Your information is used solely to manage your visit.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, !canProceed && styles.btnDisabled]}
          onPress={proceed}
          disabled={!canProceed || loading}
        >
          {loading
            ? <ActivityIndicator color="#0a0a0a" />
            : <Text style={styles.btnText}>Continue to Waiver</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  headerRow: { marginBottom: 20 },
  back: { color: '#c9a96e', fontSize: 15 },
  title: { fontSize: 24, color: '#fff', fontWeight: '600', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 32 },
  form: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  hint: { fontSize: 12, color: '#444', marginTop: 4 },
  privacyBox: {
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  privacyText: { fontSize: 12, color: '#555', lineHeight: 18 },
  privacyLink: { color: '#c9a96e', textDecorationLine: 'underline' },
  btn: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
})
