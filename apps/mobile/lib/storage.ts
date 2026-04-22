import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'ao_member_session'

export async function saveSession(sessionId: string, memberId: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ sessionId, memberId }))
}

export async function getSession(): Promise<{ sessionId: string; memberId: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
