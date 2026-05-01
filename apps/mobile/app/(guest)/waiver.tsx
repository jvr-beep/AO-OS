import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import SignatureCanvas from 'react-native-signature-canvas'
import { router } from 'expo-router'
import { getWaiverBody, submitGuestWaiver } from '@/lib/guest-api'
import { bookingState } from '@/lib/booking-state'

type Step = 'loading' | 'read' | 'sign' | 'submitting' | 'done'

export default function GuestWaiverScreen() {
  const [step, setStep] = useState<Step>('loading')
  const [waiver, setWaiver] = useState<{ title: string; body: string; version: string } | null>(null)
  const signatureRef = useRef<any>(null)

  useEffect(() => {
    getWaiverBody()
      .then((w) => { setWaiver(w); setStep('read') })
      .catch(() => { setStep('read') })
  }, [])

  async function handleSignature(sig: string) {
    if (!bookingState.guestId || !waiver) return
    setStep('submitting')
    try {
      await submitGuestWaiver(bookingState.guestId, waiver.version, 'Signed electronically via AO app')
      setStep('done')
    } catch (err: any) {
      Alert.alert('Submission failed', err.message)
      setStep('sign')
    }
  }

  function proceedToPayment() {
    router.push('/(guest)/payment')
  }

  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  if (step === 'submitting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  if (step === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneIcon}>✓</Text>
        <Text style={styles.doneTitle}>Waiver signed</Text>
        <Text style={styles.doneSub}>Thank you. Proceeding to payment.</Text>
        <TouchableOpacity style={styles.btn} onPress={proceedToPayment}>
          <Text style={styles.btnText}>Continue to Payment</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (step === 'sign') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('read')} hitSlop={16}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sign Waiver</Text>
          <Text style={styles.sub}>Draw your signature in the box below</Text>
        </View>
        <View style={styles.sigContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleSignature}
            descriptionText=""
            clearText="Clear"
            confirmText="Submit Signature"
            webStyle={sigWebStyle}
            backgroundColor="#1a1a1a"
            penColor="#c9a96e"
            autoClear={false}
          />
        </View>
      </View>
    )
  }

  // step === 'read'
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{waiver?.title ?? 'Liability Waiver'}</Text>
        <Text style={styles.sub}>Please read carefully before signing</Text>
      </View>
      <ScrollView style={styles.bodyScroll} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.body}>{waiver?.body ?? ''}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => setStep('sign')}>
          <Text style={styles.btnText}>I have read — proceed to sign</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const sigWebStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; }
  .m-signature-pad--footer { background: #0f0f0f; padding: 16px; }
  .button.save { background: #c9a96e; color: #0a0a0a; border-radius: 8px; font-weight: 600; }
  .button.clear { background: #2a2a2a; color: #ccc; border-radius: 8px; }
`

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 32, gap: 16 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  back: { color: '#c9a96e', fontSize: 15, marginBottom: 16 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  sub: { fontSize: 13, color: '#666', marginTop: 4 },
  bodyScroll: { flex: 1 },
  body: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  footer: { padding: 20, paddingBottom: 36 },
  sigContainer: { flex: 1 },
  btn: { backgroundColor: '#c9a96e', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '700' },
  doneIcon: { fontSize: 56, color: '#c9a96e' },
  doneTitle: { fontSize: 22, color: '#fff', fontWeight: '600' },
  doneSub: { fontSize: 14, color: '#666' },
})
