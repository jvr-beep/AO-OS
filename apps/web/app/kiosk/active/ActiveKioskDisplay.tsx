'use client'

import { useEffect, useState } from 'react'

interface ActiveKioskDisplayProps {
  visitId: string
  tierName: string
  scheduledEndTime: string | null
  durationMinutes: number
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0:00:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ActiveKioskDisplay({
  visitId,
  tierName,
  scheduledEndTime,
  durationMinutes,
}: ActiveKioskDisplayProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (scheduledEndTime) {
      return Math.max(0, Math.floor((new Date(scheduledEndTime).getTime() - Date.now()) / 1000))
    }
    return durationMinutes * 60
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const totalSeconds = durationMinutes * 60
  const elapsed = totalSeconds - secondsLeft
  const progressPct = Math.min(100, (elapsed / totalSeconds) * 100)
  const isExpiringSoon = secondsLeft > 0 && secondsLeft <= 900 // 15 min warning

  return (
    <div className="rounded-lg bg-surface-1 border border-border-subtle p-6">
      {/* Tier name */}
      <div className="text-center mb-5">
        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Active Pass</p>
        <p className="text-base font-heading uppercase tracking-wider text-accent-primary">{tierName}</p>
      </div>

      {/* Countdown */}
      <div className="text-center mb-5">
        <p
          className={`text-5xl font-heading tabular-nums tracking-wider ${
            isExpiringSoon ? 'text-warning' : 'text-text-primary'
          }`}
        >
          {formatTime(secondsLeft)}
        </p>
        <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">
          {secondsLeft === 0 ? 'Visit ended' : 'Remaining'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-surface-0 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isExpiringSoon ? 'bg-warning' : 'bg-accent-primary'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Visit ID */}
      <p className="text-center text-xs text-text-muted font-mono tracking-wider mt-4 opacity-40">
        {visitId}
      </p>
    </div>
  )
}
