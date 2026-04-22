import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import SignatureCanvas from 'react-native-signature-canvas'
import { getCurrentWaiver, getWaiverStatus, submitWaiver, reportMobileError, WaiverDocument } from '@/lib/api'
import { getSession } from '@/lib/storage'
import { WAIVER_VERSION } from '@/lib/config'

type Step = 'loading' | 'already_signed' | 'read' | 'sign' | 'submitting' | 'done'

export default function WaiverScreen() {
  const [step, setStep] = useState<Step>('loading')
  const [waiver, setWaiver] = useState<WaiverDocument | null>(null)
  const [guestId, setGuestId] = useState<string | null>(null)
  const signatureRef = useRef<any>(null)

  useEffect(() => {
    async function load() {
      const session = await getSession()
      if (!session) return
      setGuestId(session.memberId)
      try {
        const [doc, status] = await Promise.all([
          getCurrentWaiver(),
          getWaiverStatus(session.memberId),
        ])
        setWaiver(doc)
        setStep(status.isValid ? 'already_signed' : 'read')
      } catch {
        setStep('read')
        const doc = await getCurrentWaiver()
        setWaiver(doc)
      }
    }
    load()
  }, [])

  async function handleSubmit(sig: string) {
    if (!guestId || !waiver) return
    setStep('submitting')
    try {
      await submitWaiver(guestId, sig, waiver.version ?? WAIVER_VERSION)
      setStep('done')
    } catch (err: any) {
      reportMobileError({ message: err?.message ?? 'submitWaiver failed', screen: 'waiver', errorName: err?.name })
      Alert.alert('Submission failed', err.message)
      setStep('sign')
    }
  }

  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  if (step === 'already_signed') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneIcon}>✓</Text>
        <Text style={styles.doneTitle}>Waiver on file</Text>
        <Text style={styles.doneSub}>Your current waiver is signed and valid.</Text>
      </View>
    )
  }

  if (step === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneIcon}>✓</Text>
        <Text style={styles.doneTitle}>Waiver signed</Text>
        <Text style={styles.doneSub}>Thank you. Your waiver is now on file.</Text>
      </View>
    )
  }

  if (step === 'submitting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
        <Text style={styles.doneSub} style={{ marginTop: 16, color: '#666' }}>Submitting...</Text>
      </View>
    )
  }

  if (step === 'sign') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign Waiver</Text>
          <Text style={styles.sub}>Draw your signature in the box below</Text>
        </View>

        <View style={styles.sigContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleSubmit}
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
        <Text style={styles.title}>{waiver?.title ?? 'Liability Waiver'}</Text>
        <Text style={styles.sub}>Please read before signing</Text>
      </View>
      <ScrollView style={styles.bodyScroll} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.body}>{waiver?.body ?? ''}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => setStep('sign')}>
          <Text style={styles.buttonText}>I have read — proceed to sign</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 32 },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  sub: { fontSize: 13, color: '#666', marginTop: 4 },
  bodyScroll: { flex: 1 },
  body: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  footer: { padding: 20, paddingBottom: 32 },
  button: {
    backgroundColor: '#c9a96e',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#0a0a0a', fontSize: 15, fontWeight: '600' },
  sigContainer: { flex: 1 },
  doneIcon: { fontSize: 56, color: '#c9a96e', marginBottom: 16 },
  doneTitle: { fontSize: 22, color: '#fff', fontWeight: '600', marginBottom: 8 },
  doneSub: { fontSize: 14, color: '#666', textAlign: 'center' },
})
