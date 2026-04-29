'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type ZoneType =
  | 'room' | 'amenity' | 'zone_boundary' | 'staff_area'
  | 'circulation' | 'locker_bank' | 'door' | 'access_reader'
  | 'sensor' | 'incident'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type EditMode = 'select' | 'draw'

interface Zone {
  svgElementId: string
  label: string
  objectType: ZoneType
  x: number
  y: number
  width: number
  height: number
  fill: string
  roomId: string | null
  accessZoneId: string | null
  mapObjectCode: string | null
}

interface Room { id: string; code: string; name: string; roomType: string }
interface AccessZone { id: string; code: string; name: string }

export interface ExistingMapObject {
  id: string
  code: string
  label: string
  objectType: string
  svgElementId: string | null
  roomId: string | null
  accessZoneId: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const ZONE_TYPES: ZoneType[] = [
  'room', 'amenity', 'zone_boundary', 'staff_area',
  'circulation', 'locker_bank', 'door', 'access_reader', 'sensor', 'incident',
]

const TYPE_COLOR: Record<ZoneType, string> = {
  room:          '#60a5fa',
  amenity:       '#4ade80',
  zone_boundary: '#fb923c',
  staff_area:    '#a78bfa',
  circulation:   '#94a3b8',
  locker_bank:   '#f59e0b',
  door:          '#64748b',
  access_reader: '#ef4444',
  sensor:        '#22d3ee',
  incident:      '#f87171',
}

const HANDLE_SIZE = 8

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
  e:  'ew-resize',  se: 'nwse-resize', s:  'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toSvgPt(svg: SVGSVGElement, e: MouseEvent | React.MouseEvent) {
  const pt = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const r = pt.matrixTransform(ctm.inverse())
  return { x: r.x, y: r.y }
}

function zoneHandles(z: Zone): Record<Handle, { x: number; y: number }> {
  return {
    nw: { x: z.x,              y: z.y },
    n:  { x: z.x + z.width / 2, y: z.y },
    ne: { x: z.x + z.width,    y: z.y },
    e:  { x: z.x + z.width,    y: z.y + z.height / 2 },
    se: { x: z.x + z.width,    y: z.y + z.height },
    s:  { x: z.x + z.width / 2, y: z.y + z.height },
    sw: { x: z.x,              y: z.y + z.height },
    w:  { x: z.x,              y: z.y + z.height / 2 },
  }
}

function applyHandleDrag(z: Zone, handle: Handle, dx: number, dy: number): Zone {
  let { x, y, width: w, height: h } = z
  switch (handle) {
    case 'nw': x += dx; y += dy; w -= dx; h -= dy; break
    case 'n':              y += dy;         h -= dy; break
    case 'ne':        w += dx; y += dy;     h -= dy; break
    case 'e':         w += dx;                       break
    case 'se':        w += dx;         h += dy;      break
    case 's':                          h += dy;      break
    case 'sw': x += dx; w -= dx;      h += dy;      break
    case 'w':  x += dx; w -= dx;                     break
  }
  return { ...z, x, y, width: Math.max(10, w), height: Math.max(10, h) }
}

function parseSvgContent(svgContent: string | null) {
  const fallback = { bgImage: null as string | null, viewBox: '0 0 800 400', vw: 800, vh: 400, zones: [] as Zone[] }
  if (!svgContent) return fallback
  try {
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    if (!svgEl) return fallback
    const vb = svgEl.getAttribute('viewBox') ?? '0 0 800 400'
    const [, , vw, vh] = vb.split(/\s+/).map(Number)
    const imgEl = doc.querySelector('image')
    const bgImage = imgEl?.getAttribute('href') ?? imgEl?.getAttribute('xlink:href') ?? null
    const zones: Zone[] = []
    doc.querySelectorAll('rect[id]').forEach((el) => {
      const id = el.getAttribute('id')
      if (!id) return
      zones.push({
        svgElementId: id,
        label: '',
        objectType: 'zone_boundary',
        x: parseFloat(el.getAttribute('x') ?? '0'),
        y: parseFloat(el.getAttribute('y') ?? '0'),
        width: parseFloat(el.getAttribute('width') ?? '100'),
        height: parseFloat(el.getAttribute('height') ?? '100'),
        fill: el.getAttribute('fill') ?? '#60a5fa',
        roomId: null,
        accessZoneId: null,
        mapObjectCode: null,
      })
    })
    return { bgImage, viewBox: vb, vw: vw ?? 800, vh: vh ?? 400, zones }
  } catch { return fallback }
}

function buildSvgString(bg: string | null, viewBox: string, vw: number, vh: number, zones: Zone[]) {
  const bgEl = bg ? `  <image href="${bg}" width="${vw}" height="${vh}"/>` : ''
  const rects = zones.map((z) =>
    `  <rect id="${z.svgElementId}" class="zone" x="${Math.round(z.x)}" y="${Math.round(z.y)}" width="${Math.round(z.width)}" height="${Math.round(z.height)}" fill="${z.fill}" stroke="${z.fill}"/>`
  ).join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}">`,
    `  <style>.zone{fill-opacity:0.15;stroke-width:2;cursor:pointer;transition:fill-opacity 0.2s}.zone:hover{fill-opacity:0.35}</style>`,
    bgEl,
    rects,
    `</svg>`,
  ].filter(Boolean).join('\n')
}

function toCode(svgId: string) {
  return svgId.replace(/^zone-/, '').toUpperCase().replace(/-/g, '_')
}

function slugifyLabel(label: string) {
  return 'zone-' + label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Component ──────────────────────────────────────────────────────────────

export function ZoneEditor({
  floorId,
  token,
  svgContent,
  mapObjects,
  onPublished,
}: {
  floorId: string
  token: string
  svgContent: string | null
  mapObjects: ExistingMapObject[]
  onPublished: () => void
}) {
  const API_BASE = `https://api.aosanctuary.com/v1/map-studio/floors/${floorId}`
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const svgRef = useRef<SVGSVGElement>(null)

  // Parse existing SVG once
  const [parsed] = useState(() => parseSvgContent(svgContent))

  // Zones: start from parsed SVG, enrich from mapObjects
  const [zones, setZones] = useState<Zone[]>(() =>
    parsed.zones.map((z) => {
      const mo = mapObjects.find((m) => m.svgElementId === z.svgElementId)
      if (!mo) return z
      return {
        ...z,
        label: mo.label,
        objectType: mo.objectType as ZoneType,
        fill: TYPE_COLOR[mo.objectType as ZoneType] ?? z.fill,
        roomId: mo.roomId,
        accessZoneId: mo.accessZoneId,
        mapObjectCode: mo.code,
      }
    })
  )

  const [bgImage, setBgImage] = useState<string | null>(parsed.bgImage)
  const { viewBox, vw, vh } = parsed

  // Editor state
  const [mode, setMode] = useState<EditMode>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Entity lists for dropdowns
  const [rooms, setRooms] = useState<Room[]>([])
  const [accessZones, setAccessZones] = useState<AccessZone[]>([])

  // Drag state (ref to avoid stale closure in mousemove)
  const drag = useRef<{
    type: 'draw' | 'move' | 'resize'
    startX: number; startY: number
    lastX: number; lastY: number
    zoneId?: string
    handle?: Handle
    tempId?: string
  } | null>(null)

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 5000)
  }

  // Load rooms + access zones for dropdowns
  useEffect(() => {
    fetch(`${API_BASE}/editor-data`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { rooms: [], accessZones: [] })
      .then(({ rooms: r, accessZones: az }) => { setRooms(r ?? []); setAccessZones(az ?? []) })
      .catch(() => {})
  }, [floorId])

  const selectedZone = zones.find((z) => z.svgElementId === selectedId) ?? null

  // ── Mouse interaction ────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const pt = toSvgPt(svgRef.current, e)
    const el = e.target as SVGElement

    // Resize handle
    const handle = el.getAttribute('data-handle') as Handle | null
    const handleZone = el.getAttribute('data-zone')
    if (handle && handleZone) {
      e.preventDefault()
      drag.current = { type: 'resize', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, zoneId: handleZone, handle }
      return
    }

    // Zone rect (select/move)
    const zoneId = el.getAttribute('data-zone-id')
    if (zoneId && mode === 'select') {
      e.preventDefault()
      setSelectedId(zoneId)
      drag.current = { type: 'move', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, zoneId }
      return
    }

    // Draw mode
    if (mode === 'draw') {
      e.preventDefault()
      const tempId = `zone-new-${Date.now()}`
      drag.current = { type: 'draw', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, tempId }
      setDrawRect({ x: pt.x, y: pt.y, w: 0, h: 0 })
      return
    }

    // Background click — deselect
    setSelectedId(null)
  }, [mode])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return
    e.preventDefault()
    const pt = toSvgPt(svgRef.current, e)
    const dx = pt.x - drag.current.lastX
    const dy = pt.y - drag.current.lastY
    drag.current.lastX = pt.x
    drag.current.lastY = pt.y

    if (drag.current.type === 'draw') {
      setDrawRect({
        x: Math.min(pt.x, drag.current.startX),
        y: Math.min(pt.y, drag.current.startY),
        w: Math.abs(pt.x - drag.current.startX),
        h: Math.abs(pt.y - drag.current.startY),
      })
      return
    }

    if (drag.current.type === 'move' && drag.current.zoneId) {
      const id = drag.current.zoneId
      setZones((prev) => prev.map((z) => z.svgElementId === id ? { ...z, x: z.x + dx, y: z.y + dy } : z))
      return
    }

    if (drag.current.type === 'resize' && drag.current.zoneId && drag.current.handle) {
      const id = drag.current.zoneId
      const h = drag.current.handle
      setZones((prev) => prev.map((z) => z.svgElementId === id ? applyHandleDrag(z, h, dx, dy) : z))
      return
    }
  }, [])

  const onMouseUp = useCallback(() => {
    if (!drag.current) return
    if (drag.current.type === 'draw' && drawRect && drawRect.w > 12 && drawRect.h > 12) {
      const tempId = drag.current.tempId ?? `zone-new-${Date.now()}`
      const newZone: Zone = {
        svgElementId: tempId,
        label: '',
        objectType: 'room',
        x: drawRect.x, y: drawRect.y, width: drawRect.w, height: drawRect.h,
        fill: TYPE_COLOR.room,
        roomId: null, accessZoneId: null, mapObjectCode: null,
      }
      setZones((prev) => [...prev, newZone])
      setSelectedId(tempId)
      setMode('select')
    }
    setDrawRect(null)
    drag.current = null
  }, [drawRect])

  // ── Zone property mutations ──────────────────────────────────────────────

  const patchZone = (id: string, patch: Partial<Zone>) =>
    setZones((prev) => prev.map((z) => z.svgElementId === id ? { ...z, ...patch } : z))

  const changeType = (id: string, objectType: ZoneType) =>
    patchZone(id, { objectType, fill: TYPE_COLOR[objectType] })

  const changeId = (oldId: string, newId: string) => {
    setZones((prev) => prev.map((z) => z.svgElementId === oldId ? { ...z, svgElementId: newId } : z))
    setSelectedId(newId)
  }

  const deleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.svgElementId !== id))
    setSelectedId(null)
  }

  // ── Background image ─────────────────────────────────────────────────────

  const onBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBgImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── Publish ──────────────────────────────────────────────────────────────

  const publish = async () => {
    const unlabelled = zones.find((z) => !z.label.trim())
    if (unlabelled) {
      flash('All zones need a label before publishing.', false)
      setSelectedId(unlabelled.svgElementId)
      return
    }
    const badId = zones.find((z) => z.svgElementId.startsWith('zone-new-'))
    if (badId) {
      flash('Rename all new zones (zone IDs starting with "zone-new-" are placeholders).', false)
      setSelectedId(badId.svgElementId)
      return
    }

    setBusy(true)
    try {
      // 1. Upload new SVG version
      const svgStr = buildSvgString(bgImage, viewBox, vw, vh, zones)
      const versionRes = await fetch(`${API_BASE}/versions`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ svgContent: svgStr, label: 'Zone editor update', publish: true }),
      })
      if (!versionRes.ok) {
        const j = await versionRes.json().catch(() => ({}))
        flash((j as any).message ?? 'Failed to save floor plan.', false)
        return
      }

      // 2. Upsert a MapObject for every zone
      await Promise.all(zones.map((z) =>
        fetch(`${API_BASE}/objects`, {
          method: 'PUT',
          headers: auth,
          body: JSON.stringify({
            code: z.mapObjectCode ?? toCode(z.svgElementId),
            label: z.label,
            objectType: z.objectType,
            svgElementId: z.svgElementId,
            roomId: z.roomId ?? undefined,
            accessZoneId: z.accessZoneId ?? undefined,
            active: true,
          }),
        })
      ))

      flash('Published — floor map and zone bindings updated.')
      onPublished()
    } finally {
      setBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasContent = bgImage || zones.length > 0

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode toggle */}
        <div className="flex rounded border border-border-subtle overflow-hidden">
          {(['select', 'draw'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm capitalize border-r last:border-r-0 border-border-subtle transition-colors ${
                mode === m ? 'bg-accent-primary text-white' : 'bg-surface-2 text-text-muted hover:text-text-primary'
              }`}
            >
              {m === 'draw' ? '+ Draw Zone' : 'Select'}
            </button>
          ))}
        </div>

        {/* Background image */}
        <label className="text-sm text-text-muted hover:text-text-primary cursor-pointer">
          <input type="file" accept="image/*" onChange={onBgUpload} className="sr-only" />
          {bgImage ? 'Replace image' : 'Upload floor plan image'}
        </label>

        <div className="ml-auto flex items-center gap-3">
          {msg && (
            <span className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</span>
          )}
          <span className="text-xs text-text-muted">{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
          <button
            onClick={publish}
            disabled={busy || zones.length === 0}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {busy ? 'Publishing…' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex gap-4 items-start">
        {/* Canvas */}
        <div
          className="flex-1 min-w-0 border border-border-subtle rounded bg-neutral-950 overflow-hidden"
          style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        >
          {!hasContent ? (
            <label className="flex flex-col items-center justify-center h-56 gap-2 cursor-pointer text-text-muted hover:text-text-primary transition-colors">
              <input type="file" accept="image/*" onChange={onBgUpload} className="sr-only" />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <span className="text-sm">Upload a floor plan image to get started</span>
              <span className="text-xs opacity-60">PNG, JPG, or SVG</span>
            </label>
          ) : (
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="w-full h-auto block select-none"
              style={{ userSelect: 'none' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {/* Background */}
              {bgImage && <image href={bgImage} width={vw} height={vh} />}

              {/* Zones */}
              {zones.map((z) => {
                const isSel = selectedId === z.svgElementId
                const hpts = zoneHandles(z)
                return (
                  <g key={z.svgElementId}>
                    <rect
                      data-zone-id={z.svgElementId}
                      x={z.x} y={z.y} width={z.width} height={z.height}
                      fill={z.fill}
                      fillOpacity={isSel ? 0.45 : 0.18}
                      stroke={z.fill}
                      strokeWidth={isSel ? 2 : 1}
                      strokeDasharray={isSel ? undefined : '5 3'}
                      style={{ cursor: mode === 'select' ? 'move' : 'default' }}
                    />
                    {/* Label */}
                    {z.label && (
                      <text
                        x={z.x + z.width / 2} y={z.y + z.height / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={z.fill} fontSize={Math.min(11, z.height * 0.2)}
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {z.label}
                      </text>
                    )}
                    {/* Resize handles */}
                    {isSel && (Object.entries(hpts) as [Handle, { x: number; y: number }][]).map(([h, p]) => (
                      <rect
                        key={h}
                        data-handle={h}
                        data-zone={z.svgElementId}
                        x={p.x - HANDLE_SIZE / 2} y={p.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE}
                        fill="white" stroke={z.fill} strokeWidth={1.5} rx={1}
                        style={{ cursor: HANDLE_CURSOR[h] }}
                      />
                    ))}
                  </g>
                )
              })}

              {/* Drawing rubber-band */}
              {drawRect && drawRect.w > 0 && drawRect.h > 0 && (
                <rect
                  x={drawRect.x} y={drawRect.y} width={drawRect.w} height={drawRect.h}
                  fill="#60a5fa" fillOpacity={0.18} stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 3"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>
          )}
        </div>

        {/* Properties panel */}
        {selectedZone && (
          <div className="w-64 flex-shrink-0 border border-border-subtle rounded bg-surface-2 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">Zone</h3>
              <button onClick={() => deleteZone(selectedZone.svgElementId)} className="text-xs text-critical hover:underline">
                Delete
              </button>
            </div>

            {/* Zone ID */}
            <div>
              <label className="block text-xs text-text-muted mb-1">ID (SVG element)</label>
              <input
                value={selectedZone.svgElementId}
                onChange={(e) => changeId(selectedZone.svgElementId, e.target.value)}
                className="form-input text-xs w-full font-mono"
                placeholder="zone-room-01"
              />
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Label</label>
              <input
                value={selectedZone.label}
                onChange={(e) => {
                  const label = e.target.value
                  const patch: Partial<Zone> = { label }
                  if (selectedZone.svgElementId.startsWith('zone-new-') && label) {
                    const newId = slugifyLabel(label)
                    setZones((prev) => prev.map((z) =>
                      z.svgElementId === selectedZone.svgElementId ? { ...z, label, svgElementId: newId } : z
                    ))
                    setSelectedId(newId)
                    return
                  }
                  patchZone(selectedZone.svgElementId, patch)
                }}
                className="form-input text-sm w-full"
                placeholder="e.g. Ember Room"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select
                value={selectedZone.objectType}
                onChange={(e) => changeType(selectedZone.svgElementId, e.target.value as ZoneType)}
                className="form-input text-sm w-full"
              >
                {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Room link */}
            {selectedZone.objectType === 'room' && rooms.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Link to Room</label>
                <select
                  value={selectedZone.roomId ?? ''}
                  onChange={(e) => patchZone(selectedZone.svgElementId, { roomId: e.target.value || null })}
                  className="form-input text-sm w-full"
                >
                  <option value="">— unlinked —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Access zone link */}
            {['amenity', 'zone_boundary', 'locker_bank'].includes(selectedZone.objectType) && accessZones.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Link to Access Zone</label>
                <select
                  value={selectedZone.accessZoneId ?? ''}
                  onChange={(e) => patchZone(selectedZone.svgElementId, { accessZoneId: e.target.value || null })}
                  className="form-input text-sm w-full"
                >
                  <option value="">— unlinked —</option>
                  {accessZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Color + dimensions */}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: selectedZone.fill }} />
              <span className="text-xs text-text-muted font-mono">
                {Math.round(selectedZone.x)},{Math.round(selectedZone.y)} {Math.round(selectedZone.width)}×{Math.round(selectedZone.height)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Zone list table */}
      {zones.length > 0 && (
        <div className="border border-border-subtle rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted bg-surface-2 border-b border-border-subtle">
                <th className="text-left px-3 py-2">Zone ID</th>
                <th className="text-left px-3 py-2">Label</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Linked to</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {zones.map((z) => (
                <tr
                  key={z.svgElementId}
                  className={`cursor-pointer hover:bg-surface-2 transition-colors ${selectedId === z.svgElementId ? 'bg-surface-2' : ''}`}
                  onClick={() => setSelectedId(z.svgElementId)}
                >
                  <td className="px-3 py-2 font-mono text-xs text-text-muted">{z.svgElementId}</td>
                  <td className="px-3 py-2">
                    {z.label || <span className="text-text-muted italic text-xs">unlabelled</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: z.fill }} />
                      <span className="text-xs text-text-muted">{z.objectType}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {z.roomId
                      ? (rooms.find((r) => r.id === z.roomId)?.name ?? 'room linked')
                      : z.accessZoneId
                      ? (accessZones.find((az) => az.id === z.accessZoneId)?.name ?? 'zone linked')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteZone(z.svgElementId) }}
                      className="text-xs text-critical hover:underline"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
