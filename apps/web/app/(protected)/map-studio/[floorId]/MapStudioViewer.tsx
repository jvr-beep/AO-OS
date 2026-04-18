'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface LiveObject {
  mapObjectId: string
  svgElementId: string | null
  objectType: string
  code: string
  label: string
  state: 'available' | 'occupied' | 'cleaning' | 'offline' | 'unknown'
  occupantName: string | null
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
  offline: '#ef4444',
  unknown: '#6b7280',
}

function applyOverlays(svgEl: SVGSVGElement, objects: LiveObject[], selected: string | null) {
  objects.forEach((obj) => {
    if (!obj.svgElementId) return
    const el = svgEl.getElementById(obj.svgElementId) as SVGElement | null
    if (!el) return

    const color = STATE_COLOR[obj.state]
    el.setAttribute('fill', color)
    el.setAttribute('fill-opacity', selected === obj.mapObjectId ? '0.85' : '0.45')
    el.setAttribute('stroke', selected === obj.mapObjectId ? '#e2e8f0' : color)
    el.setAttribute('stroke-width', selected === obj.mapObjectId ? '2' : '1')
    el.style.cursor = 'pointer'
    el.setAttribute('data-ao-object', obj.mapObjectId)
  })
}

export function MapStudioViewer({
  floorId,
  initialData,
}: {
  floorId: string
  initialData: LiveData | null
}) {
  const [data, setData] = useState<LiveData | null>(initialData)
  const [selected, setSelected] = useState<LiveObject | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/map-studio/${floorId}/live`, { cache: 'no-store' })
      if (res.ok) {
        const json: LiveData = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } finally {
      setRefreshing(false)
    }
  }, [floorId])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  // Apply SVG overlays after render
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

  const objectByType = data.objects.reduce<Record<string, LiveObject[]>>((acc, o) => {
    ;(acc[o.objectType] = acc[o.objectType] ?? []).push(o)
    return acc
  }, {})

  return (
    <div className="flex gap-6 items-start">
      {/* SVG Canvas */}
      <div className="flex-1 min-w-0">
        <div className="card p-4 overflow-auto">
          <div
            ref={svgContainerRef}
            className="w-full"
            dangerouslySetInnerHTML={{ __html: data.svgContent }}
          />
        </div>

        {/* Legend + refresh */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <div className="flex items-center gap-4 text-xs text-text-muted">
            {Object.entries(STATE_COLOR).map(([state, color]) => (
              <span key={state} className="flex items-center gap-1.5">
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
      <div className="w-64 flex-shrink-0 space-y-4">
        {selected ? (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-100 mb-1">{selected.label}</h3>
            <p className="text-xs text-text-muted mb-3 font-mono">{selected.code}</p>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-gray-400">Type</dt>
                <dd className="text-gray-200">{selected.objectType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">State</dt>
                <dd>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: STATE_COLOR[selected.state] + '33', color: STATE_COLOR[selected.state] }}
                  >
                    {selected.state}
                  </span>
                </dd>
              </div>
              {selected.occupantName && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">Occupant</dt>
                  <dd className="text-gray-200">{selected.occupantName}</dd>
                </div>
              )}
            </dl>
            <button
              className="mt-4 text-xs text-text-muted hover:text-text-primary"
              onClick={() => setSelected(null)}
            >
              Deselect
            </button>
          </div>
        ) : (
          <div className="card p-4 text-xs text-text-muted">
            Click an element in the map to inspect its live state.
          </div>
        )}

        {/* Object summary by type */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Objects</h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(objectByType).map(([type, objs]) => (
              <div key={type} className="flex justify-between">
                <span className="text-gray-400">{type}</span>
                <span className="text-gray-200">{objs.length}</span>
              </div>
            ))}
            {data.objects.length === 0 && (
              <p className="text-text-muted italic text-xs">No objects defined</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
