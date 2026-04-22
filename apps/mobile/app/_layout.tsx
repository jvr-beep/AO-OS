import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { getSession } from '@/lib/storage'
import { setUnauthorizedHandler } from '@/lib/api'

export default function RootLayout() {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.replace('/(auth)/login')
    })

    getSession().then((session) => {
      if (!session) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(app)/')
      }
      setChecked(true)
    })
  }, [])

  if (!checked) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
