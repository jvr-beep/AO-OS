'use client'

import { useEffect, useState } from 'react'

type Health = 'loading' | 'ok' | 'degraded' | 'unreachable'

function HealthPill({ health }: { health: Health }) {
  const color =
    health === 'ok'
      ? 'bg-success text-surface-0'
      : health === 'loading'
        ? 'bg-surface-2 text-text-muted'
        : health === 'degraded'
          ? 'bg-warning text-surface-0'
          : 'bg-critical text-surface-0'
  const label = health === 'loading' ? '...' : health
  return (
    <span className={`inline-block px-3 py-1 rounded font-semibold text-xs ${color}`}>{label}</span>
  )
}

export function ApiHealthWidget() {
  const [health, setHealth] = useState<Health>('loading')

  useEffect(() => {
    fetch('https://api.aosanctuary.com/v1/health', { cache: 'no-store' })
      .then((res) => setHealth(res.ok ? 'ok' : 'degraded'))
      .catch(() => setHealth('unreachable'))
  }, [])

  const label =
    health === 'loading' ? '—' :
    health === 'ok' ? 'Operational' :
    health === 'degraded' ? 'Degraded' : 'Unreachable'

  return (
    <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">API Health</span>
        <HealthPill health={health} />
      </div>
      <div className="text-2xl font-bold text-text-primary">{label}</div>
    </div>
  )
}
