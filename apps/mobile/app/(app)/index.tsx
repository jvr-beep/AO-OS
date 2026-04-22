import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { getMemberProfile, getQrToken, reportMobileError, MemberProfile } from '@/lib/api'

const QR_REFRESH_MS = 4 * 60 * 1000 // 4 min — token TTL is 5 min
const FOREGROUND_REFRESH_THRESHOLD_MS = 60_000 // refresh on resume if < 60s left

export default function HomeScreen() {
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchToken() {
    let result: { token: string; expiresAt: string }
    try {
      result = await getQrToken()
    } catch (err: any) {
      reportMobileError({ message: err?.message ?? 'getQrToken failed', screen: 'home', errorName: err?.name })
      throw err
    }
    const { token: t, expiresAt: exp } = result
    setToken(t)
    const expDate = new Date(exp)
    setExpiresAt(expDate)
    setSecondsLeft(Math.max(0, Math.round((expDate.getTime() - Date.now()) / 1000)))

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(fetchToken, QR_REFRESH_MS)
  }

  async function loadAll() {
    try {
      const [p] = await Promise.all([getMemberProfile(), fetchToken()])
      setProfile(p)
    } catch (err: any) {
      // 401s are handled by the unauthorized handler in _layout; other errors reported above
      if (!err?.message?.includes('Session expired')) {
        reportMobileError({ message: err?.message ?? 'loadAll failed', screen: 'home', errorName: err?.name })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAll()
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)

    // Refresh QR on foreground resume if token is near expiry or already expired
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        setExpiresAt((current) => {
          const msLeft = current ? current.getTime() - Date.now() : 0
          if (msLeft < FOREGROUND_REFRESH_THRESHOLD_MS) {
            fetchToken()
          }
          return current
        })
      }
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      appStateSub.remove()
    }
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchToken().finally(() => setRefreshing(false))
  }, [])

  const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a96e" size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a96e" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back,{' '}
          <Text style={styles.name}>
            {profile?.preferredName ?? profile?.firstName ?? profile?.displayName ?? 'Member'}
          </Text>
        </Text>
        {profile?.subscription && (
          <Text style={styles.tier}>{profile.subscription.planName}</Text>
        )}
      </View>

      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Member QR</Text>
        <Text style={styles.qrSub}>Scan at the kiosk to check in instantly</Text>

        <View style={styles.qrWrapper}>
          {token ? (
            <QRCode
              value={token}
              size={220}
              backgroundColor="#1a1a1a"
              color="#f0f0f0"
            />
          ) : (
            <ActivityIndicator color="#c9a96e" />
          )}
        </View>

        <View style={styles.qrFooter}>
          <Text style={[styles.expiry, secondsLeft < 60 && styles.expiryWarn]}>
            Refreshes in {formatSeconds(secondsLeft)}
          </Text>
          <TouchableOpacity onPress={() => { setToken(null); fetchToken() }}>
            <Text style={styles.refreshBtn}>Refresh now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {profile?.publicMemberNumber && (
        <View style={styles.memberNumCard}>
          <Text style={styles.memberNumLabel}>Member #</Text>
          <Text style={styles.memberNum}>{profile.publicMemberNumber}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { marginBottom: 28 },
  greeting: { fontSize: 22, color: '#ccc', fontWeight: '300' },
  name: { color: '#fff', fontWeight: '600' },
  tier: {
    marginTop: 4,
    fontSize: 11,
    color: '#c9a96e',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  qrCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 24,
    alignItems: 'center',
  },
  qrLabel: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  qrSub: { fontSize: 12, color: '#666', marginBottom: 24, textAlign: 'center' },
  qrWrapper: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 10,
  },
  qrFooter: { marginTop: 20, alignItems: 'center', gap: 8 },
  expiry: { fontSize: 13, color: '#666' },
  expiryWarn: { color: '#e8b84b' },
  refreshBtn: { fontSize: 13, color: '#c9a96e', textDecorationLine: 'underline' },
  memberNumCard: {
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberNumLabel: { fontSize: 13, color: '#666' },
  memberNum: { fontSize: 16, color: '#c9a96e', fontWeight: '600', letterSpacing: 1 },
})
