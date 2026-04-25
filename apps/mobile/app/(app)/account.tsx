import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import {
  getMemberProfile,
  getWristband,
  getTransactions,
  MemberProfile,
  WristbandStatus,
  WristbandTransaction,
} from '@/lib/api'
import { clearSession } from '@/lib/storage'

export default function AccountScreen() {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [wristband, setWristband] = useState<WristbandStatus | null>(null)
  const [transactions, setTransactions] = useState<WristbandTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMemberProfile(), getWristband(), getTransactions()])
      .then(([p, w, t]) => {
        setProfile(p)
        setWristband(w)
        setTransactions(t)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearSession()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  const displayName =
    profile?.displayName ??
    [profile?.firstName, profile?.preferredName].filter(Boolean).join(' ') ??
    'Member'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{displayName}</Text>
          {profile?.publicMemberNumber && (
            <Text style={styles.memberNum}>#{profile.publicMemberNumber}</Text>
          )}
        </View>
      </View>

      {profile?.subscription && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Membership</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>Plan</Text>
            <Text style={styles.cardVal}>{profile.subscription.planName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>Status</Text>
            <Text style={[styles.cardVal, profile.subscription.status === 'active' && styles.active]}>
              {profile.subscription.status}
            </Text>
          </View>
          {profile.subscription.currentPeriodEnd && (
            <View style={styles.cardRow}>
              <Text style={styles.cardKey}>Renews</Text>
              <Text style={styles.cardVal}>
                {new Date(profile.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {wristband && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Wristband</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>UID</Text>
            <Text style={[styles.cardVal, styles.mono]}>{wristband.uid}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>Status</Text>
            <Text style={[styles.cardVal, wristband.status === 'active' && styles.active]}>
              {wristband.status}
            </Text>
          </View>
          {wristband.activatedAt && (
            <View style={styles.cardRow}>
              <Text style={styles.cardKey}>Activated</Text>
              <Text style={styles.cardVal}>
                {new Date(wristband.activatedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {transactions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recent charges</Text>
          {transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txMerchant}>{tx.merchantType}</Text>
                {tx.description && (
                  <Text style={styles.txDesc}>{tx.description}</Text>
                )}
                <Text style={styles.txDate}>
                  {new Date(tx.occurredAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                </Text>
              </View>
              <Text style={[styles.txAmount, tx.transactionType === 'refund' && styles.refund]}>
                {tx.transactionType === 'refund' ? '-' : ''}
                {tx.currency.toUpperCase()} {parseFloat(tx.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#c9a96e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, color: '#c9a96e', fontWeight: '600' },
  name: { fontSize: 18, color: '#fff', fontWeight: '600' },
  memberNum: { fontSize: 12, color: '#666', marginTop: 2, letterSpacing: 1 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  cardLabel: { fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardKey: { fontSize: 14, color: '#666' },
  cardVal: { fontSize: 14, color: '#ccc', textTransform: 'capitalize' },
  active: { color: '#4ade80' },
  mono: { fontFamily: 'monospace', letterSpacing: 1, fontSize: 12 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  txLeft: { flex: 1, gap: 2 },
  txMerchant: { fontSize: 13, color: '#ccc', textTransform: 'capitalize' },
  txDesc: { fontSize: 11, color: '#555' },
  txDate: { fontSize: 11, color: '#555' },
  txAmount: { fontSize: 13, color: '#ccc', fontVariant: ['tabular-nums'] },
  refund: { color: '#4ade80' },
  signOutBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { fontSize: 15, color: '#ef4444' },
})
