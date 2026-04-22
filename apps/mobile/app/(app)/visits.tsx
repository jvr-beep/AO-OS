import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { getVisitHistory, VisitSummary } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  active: '#4ade80',
  completed: '#888',
  cancelled: '#ef4444',
}

function VisitRow({ item }: { item: VisitSummary }) {
  const start = item.startTime ? new Date(item.startTime) : null
  const color = STATUS_COLORS[item.status] ?? '#888'

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.tierName}>{item.tierName}</Text>
        {start && (
          <Text style={styles.date}>
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {'  '}
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        )}
        {item.durationMinutes > 0 && (
          <Text style={styles.duration}>{item.durationMinutes} min</Text>
        )}
      </View>
      <Text style={[styles.status, { color }]}>{item.status}</Text>
    </View>
  )
}

export default function VisitsScreen() {
  const [visits, setVisits] = useState<VisitSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const data = await getVisitHistory()
    setVisits(data)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }, [])

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
        <Text style={styles.title}>Visit History</Text>
      </View>
      <FlatList
        data={visits}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VisitRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a96e" />}
        contentContainerStyle={visits.length === 0 ? styles.empty : { paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyText}>No visits yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  rowLeft: { flex: 1 },
  tierName: { fontSize: 15, color: '#fff', fontWeight: '500' },
  date: { fontSize: 12, color: '#666', marginTop: 3 },
  duration: { fontSize: 12, color: '#555', marginTop: 2 },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  separator: { height: 1, backgroundColor: '#1a1a1a', marginHorizontal: 24 },
  empty: { flexGrow: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#444' },
})
