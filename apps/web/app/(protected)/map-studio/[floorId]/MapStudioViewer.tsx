'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface LiveObject {
  mapObjectId: string
  svgElementId: string | null
  objectType: string
  code: string
  label: string
  state: 'available' | 'occupied' | 'cleaning' | 'reserved' | 'offline' | 'incident' | 'unknown'
  occupantName: string | null
  endsAt: string | null
  timeRemainingSeconds: number | null
  cleaningStatus: string | null
  incidentNote: string | null
  metadata: Record<string, unknown>
}

interface LiveData {
  floorId: string
  versionId: string
  svgContent: string
  objects: LiveObject[]
  generatedAt: string
}

const STATE_COLOR: Record<LiveObject['state'], string> = {
  available: '#22c55e',
  occupied: '#c084fc',
  cleaning: '#facc15',
  reserved: '#60a5fa',
  offline: '#6b7280',
  incident: '#ef4444',
  unknown: '#374151',
}

function applyOverlays(svgEl: SVGSVGElement, objects: LiveObject[], selected: string | null) {
  objects.forEach((obj) => {
    if (!obj.svgElementId) return
    const el = svgEl.getElementById(obj.svgElementId) as SVGElement | null
    if (!el) return
    const color = STATE_COLOR[obj.state]
    const isSelected = selected === obj.mapObjectId
    const isPulse = obj.state === 'incident' || obj.state === 'cleaning'
    el.setAttribute('fill', color)
    el.setAttribute('fill-opacity', isSelected ? '0.85' : '0.45')
    el.setAttribute('stroke', isSelected ? '#e2e8f0' : color)
    el.setAttribute('stroke-width', isSelected ? '2' : '1')
    el.style.cursor = 'pointer'
    el.style.transition = 'fill-opacity 0.3s'
    if (isPulse) {
      el.style.animation = 'ao-pulse 1.8s ease-in-out infinite'
    } else {
      el.style.animation = ''
    }
    el.setAttribute('data-ao-object', obj.mapObjectId)
  })
}

function formatTime(secs: number): string {
  if (secs <= 0) return 'Expired'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function StatePill({ state }: { state: LiveObject['state'] }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{
        backgroundColor: STATE_COLOR[state] + '33',
        color: STATE_COLOR[state],
      }}
    >
      {state}
    </span>
  )
}

const API = 'https://api.aosanctuary.com/v1'

export function MapStudioViewer({
  floorId,
  initialData,
  token,
}: {
  floorId: string
  initialData: LiveData | null
  token: string
}) {
  const [data, setData] = useState<LiveData | null>(initialData)
  const [selected, setSelected] = useState<LiveObject | null>(null)
  const [ticker, setTicker] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${API}/map-studio/floors/${floorId}/live`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const json: LiveData = await res.json()
        setData(json)
        setLastRefresh(new Date())
        setSelected((prev) => prev ? (json.objects.find((o) => o.mapObjectId === prev.mapObjectId) ?? null) : null)
      }
    } finally {
      setRefreshing(false)
    }
  }, [floorId])

  // Auto-refresh every 30s, initial load if no initialData
  useEffect(() => {
    if (!initialData) refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  // Countdown ticker every second
  useEffect(() => {
    const id = setInterval(() => setTicker((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Apply SVG overlays
  useEffect(() => {
    if (!data || !svgContainerRef.current) return
    const svgEl = svgContainerRef.current.querySelector('svg')
    if (!svgEl) return
    applyOverlays(svgEl as SVGSVGElement, data.objects, selected?.mapObjectId ?? null)

    const handler = (e: Event) => {
      const target = e.target as Element
      const id = target.closest('[data-ao-object]')?.getAttribute('data-ao-object')
      if (!id) { setSelected(null); return }
      const obj = data.objects.find((o) => o.mapObjectId === id) ?? null
      setSelected((prev) => (prev?.mapObjectId === id ? null : obj))
    }
    svgEl.addEventListener('click', handler)
    return () => svgEl.removeEventListener('click', handler)
  }, [data, selected])

  if (!data) {
    return (
      <div className="card p-8 text-center text-text-muted text-sm">
        No published version for this floor. Upload and publish an SVG version to activate the viewer.
      </div>
    )
  }

  // Live countdown from server endsAt + elapsed seconds since fetch
  const secondsSinceFetch = Math.floor((Date.now() - new Date(data.generatedAt).getTime()) / 1000)
  const getLiveSecsRemaining = (obj: LiveObject) => {
    if (obj.timeRemainingSeconds === null) return null
    return Math.max(0, obj.timeRemainingSeconds - secondsSinceFetch)
  }

  // Stats bar
  const stateCounts = data.objects.reduce<Record<string, number>>((acc, o) => {
    acc[o.state] = (acc[o.state] ?? 0) + 1
    return acc
  }, {})

  const objectByType = data.objects.reduce<Record<string, LiveObject[]>>((acc, o) => {
    ;(acc[o.objectType] = acc[o.objectType] ?? []).push(o)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* State summary strip */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(stateCounts).map(([state, count]) => (
          <div key={state} className="flex items-center gap-1.5 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: STATE_COLOR[state as LiveObject['state']] ?? '#374151' }}
            />
            <span className="text-text-muted">{state}</span>
            <span className="font-medium text-text-primary">{count}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 items-start">
        {/* SVG Canvas */}
        <div className="flex-1 min-w-0">
          <style>{`@keyframes ao-pulse { 0%,100%{fill-opacity:0.45} 50%{fill-opacity:0.75} }`}</style>
          <div className="card p-4 overflow-auto">
            <div
              ref={svgContainerRef}
              className="w-full"
              dangerouslySetInnerHTML={{ __html: data.svgContent }}
            />
          </div>

          {/* Legend + refresh */}
          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted">
              {Object.entries(STATE_COLOR).map(([state, color]) => (
                <span key={state} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
                  {state}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>Updated {lastRefresh.toLocaleTimeString()}</span>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="text-accent-primary hover:underline disabled:opacity-50"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {selected ? (
            <div className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{selected.label}</h3>
                  <p className="text-xs text-text-muted font-mono">{selected.code}</p>
                </div>
                <StatePill state={selected.state} />
              </div>

              <dl className="text-sm space-y-2 divide-y divide-border-subtle">
                <div className="flex justify-between pt-1">
                  <dt className="text-text-muted">Type</dt>
                  <dd className="text-text-primary">{selected.objectType}</dd>
                </div>

                {selected.occupantName && (
                  <div className="flex justify-between pt-2">
                    <dt className="text-text-muted">Occupant</dt>
                    <dd className="text-text-primary text-right max-w-[160px] truncate">{selected.occupantName}</dd>
                  </div>
                )}

                {selected.endsAt && (
                  <>
                    <div className="flex justify-between pt-2">
                      <dt className="text-text-muted">Ends at</dt>
                      <dd className="text-text-primary">{new Date(selected.endsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</dd>
                    </div>
                    <div className="flex justify-between pt-2">
                      <dt className="text-text-muted">Time left</dt>
                      <dd className={`font-medium tabular-nums ${(getLiveSecsRemaining(selected) ?? 999) < 300 ? 'text-warning' : 'text-text-primary'}`}>
                        {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
                        {ticker > -1 && formatTime(getLiveSecsRemaining(selected) ?? 0)}
                      </dd>
                    </div>
                  </>
                )}

                {selected.cleaningStatus && (
                  <div className="flex justify-between pt-2">
                    <dt className="text-text-muted">Cleaning</dt>
                    <dd className="text-warning">{selected.cleaningStatus}</dd>
                  </div>
                )}

                {selected.incidentNote && (
                  <div className="pt-2">
                    <dt className="text-text-muted mb-1">Incident</dt>
                    <dd className="text-critical text-xs leading-relaxed">{selected.incidentNote}</dd>
                  </div>
                )}
              </dl>

              <button
                className="text-xs text-text-muted hover:text-text-primary"
                onClick={() => setSelected(null)}
              >
                Deselect
              </button>
            </div>
          ) : (
            <div className="card p-4 text-xs text-text-muted">
              Click an element to inspect its live state.
            </div>
          )}

          {/* Object count by type */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Objects</h3>
            <div className="space-y-1.5 text-sm">
              {Object.entries(objectByType).map(([type, objs]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-text-muted">{type}</span>
                  <span className="text-text-primary">{objs.length}</span>
                </div>
              ))}
              {data.objects.length === 0 && (
                <p className="text-text-muted italic text-xs">No objects defined</p>
              )}
            </div>
          </div>

          {/* Alerts: incidents + expiring soon */}
          {(() => {
            const incidents = data.objects.filter((o) => o.state === 'incident')
            const expiring = data.objects.filter((o) => {
              const secs = getLiveSecsRemaining(o)
              return secs !== null && secs > 0 && secs < 300
            })
            if (incidents.length === 0 && expiring.length === 0) return null
            return (
              <div className="card p-4 border-red-800/40 bg-red-950/20">
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Alerts</h3>
                <ul className="space-y-1.5 text-xs">
                  {incidents.map((o) => (
                    <li key={o.mapObjectId} className="text-red-300">
                      ⚠ {o.label}{o.incidentNote ? ` — ${o.incidentNote}` : ''}
                    </li>
                  ))}
                  {expiring.map((o) => (
                    <li key={o.mapObjectId} className="text-yellow-300">
                      ⏱ {o.label} — {formatTime(getLiveSecsRemaining(o) ?? 0)} left
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
