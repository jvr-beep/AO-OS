'use client'

import { useEffect, useState, useCallback } from 'react'

interface LiveVisit {
  visitId: string
  guestName: string
  tierName: string
  scheduledEndTime: string | null
  durationMinutes: number
}

interface LiveArea {
  id: string
  code: string
  name: string
  areaType: string
  x: string
  y: string
  width: string
  height: string
  occupancy: number
  cleaningStatus: string | null
  rfidStatus: 'online' | 'degraded' | 'unknown'
  activeVisits: LiveVisit[]
}

interface LiveData {
  id: string
  name: string
  locationId: string
  fetchedAt: string
  areas: LiveArea[]
}

function pct(value: string) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? `${n}%` : '0%'
}

function timeRemaining(end: string | null): string {
  if (!end) return '—'
  const secs = Math.floor((new Date(end).getTime() - Date.now()) / 1000)
  if (secs <= 0) return 'Expired'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function areaColor(area: LiveArea): { border: string; bg: string; text: string } {
  if (area.cleaningStatus === 'in_progress') return { border: 'border-warning', bg: 'bg-warning/20', text: 'text-warning' }
  if (area.cleaningStatus === 'open') return { border: 'border-yellow-600', bg: 'bg-yellow-900/20', text: 'text-yellow-400' }
  if (area.occupancy > 0) return { border: 'border-accent-primary', bg: 'bg-accent-primary/20', text: 'text-accent-primary' }
  return { border: 'border-border-subtle', bg: 'bg-surface-2/40', text: 'text-text-muted' }
}

function statusDot(area: LiveArea) {
  if (area.cleaningStatus === 'in_progress') return 'bg-warning animate-pulse'
  if (area.cleaningStatus === 'open') return 'bg-yellow-400'
  if (area.occupancy > 0) return 'bg-accent-primary'
  return 'bg-surface-2'
}

export function FloorPlanLiveView({
  floorPlanId,
  initialData,
}: {
  floorPlanId: string
  initialData: LiveData | null
}) {
  const [data, setData] = useState<LiveData | null>(initialData)
  const [selectedArea, setSelectedArea] = useState<LiveArea | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/floor-plans/${floorPlanId}/live`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
        // Keep selected area in sync
        if (selectedArea) {
          const updated = json.areas.find((a: LiveArea) => a.id === selectedArea.id)
          if (updated) setSelectedArea(updated)
        }
      }
    } finally {
      setRefreshing(false)
    }
  }, [floorPlanId, selectedArea])

  useEffect(() => {
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  if (!data) {
    return (
      <div className="card p-8 text-center text-sm text-text-muted">
        No live data available.
      </div>
    )
  }

  const totalOccupancy = data.areas.reduce((sum, a) => sum + a.occupancy, 0)
  const cleaningActive = data.areas.filter((a) => a.cleaningStatus === 'in_progress').length
  const cleaningQueued = data.areas.filter((a) => a.cleaningStatus === 'open').length

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-muted">
            <span className="text-text-primary font-semibold">{totalOccupancy}</span> guests active
          </span>
          {cleaningActive > 0 && (
            <span className="text-warning text-xs uppercase tracking-wider">
              {cleaningActive} cleaning in progress
            </span>
          )}
          {cleaningQueued > 0 && (
            <span className="text-yellow-400 text-xs uppercase tracking-wider">
              {cleaningQueued} queued
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {lastRefresh.toLocaleTimeString()} · auto-refresh 30s
          </span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors disabled:opacity-40 uppercase tracking-wider"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* Map canvas */}
        <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
          <div className="relative w-full aspect-[16/10] border border-border-subtle rounded bg-surface-0 overflow-hidden">
            {data.areas.map((area) => {
              const colors = areaColor(area)
              const isSelected = selectedArea?.id === area.id
              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(isSelected ? null : area)}
                  className={`absolute border transition-all duration-200 text-left overflow-hidden ${colors.border} ${colors.bg} ${
                    isSelected ? 'ring-1 ring-white/30' : ''
                  }`}
                  style={{
                    left: pct(area.x),
                    top: pct(area.y),
                    width: pct(area.width),
                    height: pct(area.height),
                  }}
                >
                  <div className="p-1">
                    <div className={`text-[9px] font-semibold truncate ${colors.text}`}>
                      {area.code}
                    </div>
                    <div className="text-[9px] text-text-muted truncate">{area.name}</div>
                    {area.occupancy > 0 && (
                      <div className={`text-[9px] font-medium ${colors.text}`}>
                        {area.occupancy}
                      </div>
                    )}
                    {area.cleaningStatus && (
                      <div className="text-[8px] text-warning uppercase truncate">
                        {area.cleaningStatus === 'in_progress' ? '◉ cleaning' : '○ queued'}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { dot: 'bg-accent-primary', label: 'Occupied' },
              { dot: 'bg-warning animate-pulse', label: 'Cleaning' },
              { dot: 'bg-yellow-400', label: 'Queued' },
              { dot: 'bg-surface-2 border border-border-subtle', label: 'Empty' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden">
          {selectedArea ? (
            <div>
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{selectedArea.name}</p>
                  <p className="text-xs text-text-muted font-mono">{selectedArea.code} · {selectedArea.areaType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusDot(selectedArea)}`} />
                  <button
                    onClick={() => setSelectedArea(null)}
                    className="text-xs text-text-muted hover:text-text-primary ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Cleaning status */}
              {selectedArea.cleaningStatus && (
                <div className="px-4 py-2 border-b border-border-subtle bg-warning/10">
                  <p className="text-xs text-warning uppercase tracking-wider">
                    Cleaning: {selectedArea.cleaningStatus.replace('_', ' ')}
                  </p>
                </div>
              )}

              {/* RFID status */}
              <div className="px-4 py-2 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedArea.rfidStatus === 'online' ? 'bg-green-400' : 'bg-text-muted'
                  }`} />
                  <span className="text-xs text-text-muted uppercase tracking-wider">
                    RFID {selectedArea.rfidStatus}
                  </span>
                </div>
              </div>

              {/* Active visits */}
              <div className="px-4 py-3">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
                  Active visits ({selectedArea.occupancy})
                </p>
                {selectedArea.activeVisits.length === 0 ? (
                  <p className="text-xs text-text-muted">No active visits</p>
                ) : (
                  <div className="space-y-2">
                    {selectedArea.activeVisits.map((v) => (
                      <div key={v.visitId} className="text-xs border border-border-subtle rounded p-2">
                        <div className="flex justify-between">
                          <span className="text-text-primary font-medium">{v.guestName}</span>
                          <span className="text-accent-primary font-mono">{timeRemaining(v.scheduledEndTime)}</span>
                        </div>
                        <div className="text-text-muted mt-0.5">{v.tierName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-sm font-semibold text-text-secondary">Zone Summary</p>
              </div>
              <div className="divide-y divide-border-subtle">
                {data.areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-2 transition-colors flex items-center gap-3"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(area)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-primary truncate">{area.name}</p>
                      <p className="text-xs text-text-muted font-mono">{area.code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {area.occupancy > 0 && (
                        <span className="text-xs text-accent-primary">{area.occupancy}</span>
                      )}
                      {area.cleaningStatus === 'in_progress' && (
                        <span className="text-xs text-warning">cleaning</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
