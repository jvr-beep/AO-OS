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
import { getMemberProfile, MemberProfile } from '@/lib/api'
import { clearSession } from '@/lib/storage'

export default function AccountScreen() {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemberProfile()
      .then(setProfile)
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
