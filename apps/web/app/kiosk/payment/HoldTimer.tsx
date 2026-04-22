'use client'

import { useEffect, useState } from 'react'

interface HoldTimerProps {
  expiresAt: string
}

export function HoldTimer({ expiresAt }: HoldTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [secondsLeft])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isExpiring = secondsLeft <= 60
  const isExpired = secondsLeft === 0

  if (isExpired) {
    return (
      <p className="text-xs text-critical text-center">
        Hold expired — please restart your session.
      </p>
    )
  }

  return (
    <p className={`text-xs text-center ${isExpiring ? 'text-warning' : 'text-text-muted'}`}>
      Resource held for{' '}
      <span className="font-mono font-semibold">
        {minutes}:{String(seconds).padStart(2, '0')}
      </span>
    </p>
  )
}
