'use client'

import { useEffect } from 'react'
import { storeBrowserSession } from '@/lib/browser-auth'
import type { Role } from '@/types/api'

type BrowserSessionSyncProps = {
  accessToken: string
  userId: string
  userEmail: string
  userFullName: string
  userRole: Role
}

export function BrowserSessionSync({
  accessToken,
  userId,
  userEmail,
  userFullName,
  userRole,
}: BrowserSessionSyncProps) {
  useEffect(() => {
    storeBrowserSession(accessToken, {
      id: userId,
      email: userEmail,
      fullName: userFullName,
      role: userRole,
    })
  }, [accessToken, userEmail, userFullName, userId, userRole])

  return null
}