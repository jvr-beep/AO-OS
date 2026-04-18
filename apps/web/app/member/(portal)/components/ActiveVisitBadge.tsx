'use client'

import { useEffect, useState } from 'react'
import type { ActiveVisit } from '@/lib/member-api'

const MODE_LABELS: Record<string, string> = {
  restore: 'Restore',
  release: 'Release',
  retreat: 'Retreat',
}

function formatTimeRemaining(scheduledEndTime: string | null): string {
  if (!scheduledEndTime) return '--'
  const ms = new Date(scheduledEndTime).getTime() - Date.now()
  if (ms <= 0) return 'Ending'
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m remaining`
  return `${mins}m remaining`
}

export function ActiveVisitBadge({ visit }: { visit: ActiveVisit }) {
  const [timeRemaining, setTimeRemaining] = useState(() => formatTimeRemaining(visit.scheduledEndTime))

  useEffect(() => {
    if (!visit.scheduledEndTime) return
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(visit.scheduledEndTime))
    }, 30_000)
    return () => clearInterval(interval)
  }, [visit.scheduledEndTime])

  const modeLabel = visit.visitMode ? (MODE_LABELS[visit.visitMode] ?? visit.visitMode) : null

  return (
    <div className="rounded-lg bg-surface-1 border border-accent-primary p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            <p className="text-xs text-text-muted uppercase tracking-wider">Active Visit</p>
          </div>
          <p className="text-lg font-heading uppercase tracking-wider text-text-primary">{visit.tierName}</p>
          {modeLabel && (
            <p className="text-xs text-accent-primary uppercase tracking-wider mt-1">{modeLabel}</p>
          )}
          {visit.startTime && (
            <p className="text-xs text-text-muted mt-1">
              Since {new Date(visit.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {visit.scheduledEndTime && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-mono text-text-primary">{timeRemaining}</p>
            <p className="text-xs text-text-muted uppercase tracking-wider mt-0.5">
              {visit.durationMinutes}min session
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
