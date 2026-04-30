'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type ZoneType =
  | 'room' | 'staff_area' | 'circulation'
  | 'door' | 'access_reader' | 'zone_boundary'
  | 'locker_bank' | 'amenity' | 'sensor' | 'incident'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type Mode = 'select' | 'place'

interface Zone {
  svgElementId: string
  label: string
  objectType: ZoneType
  x: number; y: number; width: number; height: number
  fill: string
  roomId: string | null
  accessZoneId: string | null
  mapObjectCode: string | null
}

interface Room { id: string; code: string; name: string; roomType: string }
interface AccessZone { id: string; code: string; name: string }

export interface ExistingMapObject {
  id: string; code: string; label: string; objectType: string
  svgElementId: string | null; roomId: string | null; accessZoneId: string | null
}

interface ObjectDef {
  type: ZoneType; label: string; category: string
  isPoint: boolean; color: string; defaultW: number; defaultH: number
}

// ── Object catalogue ───────────────────────────────────────────────────────

const OBJECT_DEFS: ObjectDef[] = [
  { type: 'room',          label: 'Room',          category: 'Spaces',    isPoint: false, color: '#60a5fa', defaultW: 120, defaultH: 80  },
  { type: 'staff_area',   label: 'Staff Area',    category: 'Spaces',    isPoint: false, color: '#a78bfa', defaultW: 100, defaultH: 70  },
  { type: 'circulation',  label: 'Circulation',   category: 'Spaces',    isPoint: false, color: '#94a3b8', defaultW: 60,  defaultH: 100 },
  { type: 'door',         label: 'Door',          category: 'Access',    isPoint: true,  color: '#64748b', defaultW: 50,  defaultH: 12  },
  { type: 'access_reader',label: 'Access Reader', category: 'Access',    isPoint: true,  color: '#ef4444', defaultW: 24,  defaultH: 24  },
  { type: 'zone_boundary',label: 'Zone Boundary', category: 'Access',    isPoint: false, color: '#fb923c', defaultW: 150, defaultH: 100 },
  { type: 'locker_bank',  label: 'Locker Bank',   category: 'Equipment', isPoint: false, color: '#f59e0b', defaultW: 120, defaultH: 35  },
  { type: 'amenity',      label: 'Amenity',       category: 'Equipment', isPoint: false, color: '#4ade80', defaultW: 60,  defaultH: 60  },
  { type: 'sensor',       label: 'Sensor',        category: 'Equipment', isPoint: true,  color: '#22d3ee', defaultW: 22,  defaultH: 22  },
  { type: 'incident',     label: 'Incident Zone', category: 'Equipment', isPoint: true,  color: '#f87171', defaultW: 26,  defaultH: 26  },
]

const TYPE_COLOR = Object.fromEntries(OBJECT_DEFS.map(d => [d.type, d.color])) as Record<ZoneType, string>
const CATEGORIES = ['Spaces', 'Access', 'Equipment']
const HANDLE_SIZE = 8
const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
  e:  'ew-resize',  se: 'nwse-resize', s:  'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
}

// ── Palette icons (inline SVG) ─────────────────────────────────────────────

function PaletteIcon({ type, color }: { type: ZoneType; color: string }) {
  const s = color
  const defs: Record<ZoneType, JSX.Element> = {
    room:         <><rect x="2" y="2" width="16" height="16" rx="2" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.25"/></>,
    staff_area:   <><rect x="2" y="2" width="16" height="16" rx="2" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.1"/><path d="M2 6L6 2M2 10L10 2M2 14L14 2M2 18L18 2M6 18L18 6M10 18L18 10M14 18L18 14" stroke={s} strokeWidth="0.8" opacity="0.6"/></>,
    circulation:  <><rect x="2" y="2" width="16" height="16" rx="2" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.1"/><path d="M5 10h10M12 7l3 3-3 3" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    door:         <><rect x="4" y="1" width="12" height="18" rx="1" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.2"/><circle cx="14" cy="10" r="1.5" fill={s}/></>,
    access_reader:<><rect x="2" y="2" width="16" height="16" rx="3" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.15"/><rect x="7" y="7" width="6" height="6" rx="1" stroke={s} strokeWidth="1.2" fill="none"/><circle cx="10" cy="10" r="1.2" fill={s}/></>,
    zone_boundary:<><rect x="2" y="2" width="16" height="16" rx="2" stroke={s} strokeWidth="1.5" strokeDasharray="4 2.5" fill="none"/></>,
    locker_bank:  <><rect x="1" y="5" width="18" height="10" rx="1" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.15"/><line x1="7" y1="5" x2="7" y2="15" stroke={s} strokeWidth="1"/><line x1="13" y1="5" x2="13" y2="15" stroke={s} strokeWidth="1"/><circle cx="4" cy="10" r="1" fill={s}/><circle cx="10" cy="10" r="1" fill={s}/><circle cx="16" cy="10" r="1" fill={s}/></>,
    amenity:      <><rect x="2" y="2" width="16" height="16" rx="6" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.25"/></>,
    sensor:       <><circle cx="10" cy="10" r="7" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.15"/><circle cx="10" cy="10" r="3" stroke={s} strokeWidth="1.2" fill="none"/><circle cx="10" cy="10" r="1" fill={s}/></>,
    incident:     <><circle cx="10" cy="10" r="7" stroke={s} strokeWidth="1.5" fill={s} fillOpacity="0.15"/><path d="M10 6v5" stroke={s} strokeWidth="1.8" strokeLinecap="round"/><circle cx="10" cy="14" r="1" fill={s}/></>,
  }
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none">{defs[type]}</svg>
}

// ── Canvas zone graphic ────────────────────────────────────────────────────

function ZoneGraphic({ z, isSel }: { z: Zone; isSel: boolean }) {
  const f = z.fill
  const fO = isSel ? 0.55 : 0.22
  const sw = isSel ? 2 : 1.5
  const { x, y, width: w, height: h, objectType: t } = z

  switch (t) {
    case 'sensor': {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2
      return <><circle cx={cx} cy={cy} r={r} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw}/><circle cx={cx} cy={cy} r={r * 0.35} fill={f} fillOpacity={0.8}/></>
    }
    case 'incident': {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2
      return <><circle cx={cx} cy={cy} r={r} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw}/><path d={`M${cx} ${cy - r * 0.45}v${r * 0.5}`} stroke={f} strokeWidth={2} strokeLinecap="round"/><circle cx={cx} cy={cy + r * 0.3} r={r * 0.12} fill={f}/></>
    }
    case 'access_reader': {
      const cx = x + w / 2, cy = y + h / 2
      return <><rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw} rx={2}/><circle cx={cx} cy={cy} r={Math.min(w, h) * 0.22} fill={f} fillOpacity={0.7}/></>
    }
    case 'zone_boundary':
      return <rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={0.06} stroke={f} strokeWidth={isSel ? 2 : 1.5} strokeDasharray="8 4"/>
    case 'locker_bank': {
      const cols = Math.max(2, Math.round(w / 28))
      const divs = Array.from({ length: cols - 1 }, (_, i) => {
        const lx = x + ((i + 1) * w) / cols
        return <line key={i} x1={lx} y1={y + 2} x2={lx} y2={y + h - 2} stroke={f} strokeWidth={1} opacity={0.7}/>
      })
      return <><rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw} rx={1}/>{divs}</>
    }
    case 'amenity':
      return <rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw} rx={8}/>
    case 'staff_area':
      return <rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw} strokeDasharray="5 3"/>
    case 'door': {
      const cx = x + w * 0.8, cy = y + h / 2
      return <><rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO + 0.15} stroke={f} strokeWidth={sw} rx={1}/><circle cx={cx} cy={cy} r={Math.min(h * 0.3, 5)} fill={f}/></>
    }
    default:
      return <rect x={x} y={y} width={w} height={h} fill={f} fillOpacity={fO} stroke={f} strokeWidth={sw}/>
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toSvgPt(svg: SVGSVGElement, e: React.MouseEvent) {
  const pt = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  return pt.matrixTransform(ctm.inverse())
}

function zoneHandles(z: Zone): Record<Handle, { x: number; y: number }> {
  return {
    nw: { x: z.x,              y: z.y              },
    n:  { x: z.x + z.width/2,  y: z.y              },
    ne: { x: z.x + z.width,    y: z.y              },
    e:  { x: z.x + z.width,    y: z.y + z.height/2 },
    se: { x: z.x + z.width,    y: z.y + z.height   },
    s:  { x: z.x + z.width/2,  y: z.y + z.height   },
    sw: { x: z.x,              y: z.y + z.height   },
    w:  { x: z.x,              y: z.y + z.height/2 },
  }
}

function applyHandle(z: Zone, handle: Handle, dx: number, dy: number): Zone {
  let { x, y, width: w, height: h } = z
  switch (handle) {
    case 'nw': x+=dx; y+=dy; w-=dx; h-=dy; break
    case 'n':         y+=dy;        h-=dy; break
    case 'ne':  w+=dx; y+=dy;      h-=dy; break
    case 'e':   w+=dx;                     break
    case 'se':  w+=dx;        h+=dy;       break
    case 's':                 h+=dy;       break
    case 'sw': x+=dx; w-=dx; h+=dy;       break
    case 'w':  x+=dx; w-=dx;              break
  }
  return { ...z, x, y, width: Math.max(8, w), height: Math.max(8, h) }
}

function parseSvg(svgContent: string | null) {
  const fallback = { bgImage: null as string | null, viewBox: '0 0 800 400', vw: 800, vh: 400, zones: [] as Zone[] }
  if (!svgContent) return fallback
  try {
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    if (!svgEl) return fallback
    const vb = svgEl.getAttribute('viewBox') ?? '0 0 800 400'
    const [,, vw, vh] = vb.split(/\s+/).map(Number)
    const imgEl = doc.querySelector('image')
    const bgImage = imgEl?.getAttribute('href') ?? imgEl?.getAttribute('xlink:href') ?? null
    const zones: Zone[] = []
    doc.querySelectorAll('rect[id]').forEach((el) => {
      const id = el.getAttribute('id')
      if (!id) return
      zones.push({
        svgElementId: id, label: '', objectType: 'zone_boundary',
        x: parseFloat(el.getAttribute('x') ?? '0'),
        y: parseFloat(el.getAttribute('y') ?? '0'),
        width: parseFloat(el.getAttribute('width') ?? '100'),
        height: parseFloat(el.getAttribute('height') ?? '100'),
        fill: el.getAttribute('fill') ?? '#60a5fa',
        roomId: null, accessZoneId: null, mapObjectCode: null,
      })
    })
    return { bgImage, viewBox: vb, vw: vw ?? 800, vh: vh ?? 400, zones }
  } catch { return fallback }
}

function buildSvg(bg: string | null, viewBox: string, vw: number, vh: number, zones: Zone[]) {
  const bgEl = bg ? `  <image href="${bg}" width="${vw}" height="${vh}"/>` : ''
  const rects = zones.map((z) =>
    `  <rect id="${z.svgElementId}" class="zone" x="${Math.round(z.x)}" y="${Math.round(z.y)}" width="${Math.round(z.width)}" height="${Math.round(z.height)}" fill="${z.fill}" stroke="${z.fill}"/>`
  ).join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}">`,
    `  <style>.zone{fill-opacity:0.15;stroke-width:2;cursor:pointer;transition:fill-opacity 0.2s}.zone:hover{fill-opacity:0.35}</style>`,
    bgEl, rects, `</svg>`,
  ].filter(Boolean).join('\n')
}

function toCode(svgId: string) {
  return svgId.replace(/^zone-/, '').toUpperCase().replace(/-/g, '_')
}

function slugify(label: string) {
  return 'zone-' + label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Component ──────────────────────────────────────────────────────────────

export function ZoneEditor({
  floorId, token, svgContent, mapObjects, onPublished,
}: {
  floorId: string; token: string; svgContent: string | null
  mapObjects: ExistingMapObject[]; onPublished: () => void
}) {
  const API_BASE = `https://api.aosanctuary.com/v1/map-studio/floors/${floorId}`
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const svgRef = useRef<SVGSVGElement>(null)

  const [parsed] = useState(() => parseSvg(svgContent))
  const [zones, setZones] = useState<Zone[]>(() =>
    parsed.zones.map((z) => {
      const mo = mapObjects.find((m) => m.svgElementId === z.svgElementId)
      if (!mo) return z
      return { ...z, label: mo.label, objectType: mo.objectType as ZoneType, fill: TYPE_COLOR[mo.objectType as ZoneType] ?? z.fill, roomId: mo.roomId, accessZoneId: mo.accessZoneId, mapObjectCode: mo.code }
    })
  )
  const [bgImage, setBgImage] = useState<string | null>(parsed.bgImage)
  const { viewBox, vw, vh } = parsed

  const [mode, setMode] = useState<Mode>('select')
  const [placeType, setPlaceType] = useState<ZoneType>('room')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [accessZones, setAccessZones] = useState<AccessZone[]>([])

  const drag = useRef<{
    type: 'draw' | 'move' | 'resize'
    startX: number; startY: number; lastX: number; lastY: number
    zoneId?: string; handle?: Handle; tempId?: string
  } | null>(null)

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000) }

  useEffect(() => {
    fetch(`${API_BASE}/editor-data`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { rooms: [], accessZones: [] })
      .then(({ rooms: r, accessZones: az }) => { setRooms(r ?? []); setAccessZones(az ?? []) })
      .catch(() => {})
  }, [floorId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMode('select'); setSelectedId(null) }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
          setZones((prev) => prev.filter((z) => z.svgElementId !== selectedId))
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selectedId])

  const selectedZone = zones.find((z) => z.svgElementId === selectedId) ?? null

  const activatePlaceType = (t: ZoneType) => { setPlaceType(t); setMode('place'); setSelectedId(null) }

  // ── Mouse ─────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const pt = toSvgPt(svgRef.current, e)
    const el = e.target as SVGElement

    const handle = el.getAttribute('data-handle') as Handle | null
    const handleZone = el.getAttribute('data-zone')
    if (handle && handleZone) {
      e.preventDefault()
      drag.current = { type: 'resize', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, zoneId: handleZone, handle }
      return
    }

    const zoneId = el.getAttribute('data-hit')
    if (zoneId && mode === 'select') {
      e.preventDefault()
      setSelectedId(zoneId)
      drag.current = { type: 'move', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, zoneId }
      return
    }

    if (mode === 'place') {
      e.preventDefault()
      const tempId = `zone-new-${Date.now()}`
      drag.current = { type: 'draw', startX: pt.x, startY: pt.y, lastX: pt.x, lastY: pt.y, tempId }
      setDrawRect({ x: pt.x, y: pt.y, w: 0, h: 0 })
      return
    }

    setSelectedId(null)
  }, [mode])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return
    e.preventDefault()
    const pt = toSvgPt(svgRef.current, e)
    const dx = pt.x - drag.current.lastX
    const dy = pt.y - drag.current.lastY
    drag.current.lastX = pt.x; drag.current.lastY = pt.y

    if (drag.current.type === 'draw') {
      setDrawRect({ x: Math.min(pt.x, drag.current.startX), y: Math.min(pt.y, drag.current.startY), w: Math.abs(pt.x - drag.current.startX), h: Math.abs(pt.y - drag.current.startY) })
      return
    }
    if (drag.current.type === 'move' && drag.current.zoneId) {
      const id = drag.current.zoneId
      setZones((prev) => prev.map((z) => z.svgElementId === id ? { ...z, x: z.x + dx, y: z.y + dy } : z))
      return
    }
    if (drag.current.type === 'resize' && drag.current.zoneId && drag.current.handle) {
      const id = drag.current.zoneId; const h = drag.current.handle
      setZones((prev) => prev.map((z) => z.svgElementId === id ? applyHandle(z, h, dx, dy) : z))
    }
  }, [])

  const onMouseUp = useCallback(() => {
    if (!drag.current) return
    if (drag.current.type === 'draw') {
      const def = OBJECT_DEFS.find(d => d.type === placeType)!
      const isClick = (drawRect?.w ?? 0) < 6 && (drawRect?.h ?? 0) < 6
      const w = isClick ? def.defaultW : Math.max(8, drawRect?.w ?? def.defaultW)
      const h = isClick ? def.defaultH : Math.max(8, drawRect?.h ?? def.defaultH)
      const x = isClick ? drag.current.startX - w / 2 : (drawRect?.x ?? drag.current.startX)
      const y = isClick ? drag.current.startY - h / 2 : (drawRect?.y ?? drag.current.startY)
      const tempId = drag.current.tempId ?? `zone-new-${Date.now()}`
      const newZone: Zone = { svgElementId: tempId, label: '', objectType: placeType, x, y, width: w, height: h, fill: TYPE_COLOR[placeType], roomId: null, accessZoneId: null, mapObjectCode: null }
      setZones((prev) => [...prev, newZone])
      setSelectedId(tempId)
      setMode('select')
    }
    setDrawRect(null)
    drag.current = null
  }, [drawRect, placeType])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const patch = (id: string, p: Partial<Zone>) => setZones((prev) => prev.map((z) => z.svgElementId === id ? { ...z, ...p } : z))
  const changeType = (id: string, t: ZoneType) => patch(id, { objectType: t, fill: TYPE_COLOR[t] })
  const changeId = (oldId: string, newId: string) => { setZones((prev) => prev.map((z) => z.svgElementId === oldId ? { ...z, svgElementId: newId } : z)); setSelectedId(newId) }
  const del = (id: string) => { setZones((prev) => prev.filter((z) => z.svgElementId !== id)); setSelectedId(null) }

  const onBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => setBgImage(reader.result as string); reader.readAsDataURL(file)
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  const publish = async () => {
    const unlabelled = zones.find((z) => !z.label.trim())
    if (unlabelled) { flash('All objects need a label.', false); setSelectedId(unlabelled.svgElementId); return }
    const badId = zones.find((z) => z.svgElementId.startsWith('zone-new-'))
    if (badId) { flash('Rename placeholder IDs first.', false); setSelectedId(badId.svgElementId); return }
    setBusy(true)
    try {
      const vRes = await fetch(`${API_BASE}/versions`, { method: 'POST', headers: auth, body: JSON.stringify({ svgContent: buildSvg(bgImage, viewBox, vw, vh, zones), label: 'Zone editor update', publish: true }) })
      if (!vRes.ok) { const j = await vRes.json().catch(() => ({})); flash((j as any).message ?? 'Failed.', false); return }
      await Promise.all(zones.map((z) => fetch(`${API_BASE}/objects`, { method: 'PUT', headers: auth, body: JSON.stringify({ code: z.mapObjectCode ?? toCode(z.svgElementId), label: z.label, objectType: z.objectType, svgElementId: z.svgElementId, roomId: z.roomId ?? undefined, accessZoneId: z.accessZoneId ?? undefined, active: true }) })))
      flash('Published — floor map updated.')
      onPublished()
    } finally { setBusy(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const categorized = CATEGORIES.map(cat => ({ cat, items: OBJECT_DEFS.filter(d => d.category === cat) }))
  const hasContent = bgImage || zones.length > 0

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="text-sm text-text-muted hover:text-text-primary cursor-pointer">
          <input type="file" accept="image/*" onChange={onBgUpload} className="sr-only"/>
          {bgImage ? '↺ Replace floor plan' : '↑ Upload floor plan image'}
        </label>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</span>}
          <span className="text-xs text-text-muted">{zones.length} object{zones.length !== 1 ? 's' : ''}</span>
          <button onClick={publish} disabled={busy || zones.length === 0} className="btn-primary text-sm disabled:opacity-40">
            {busy ? 'Publishing…' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Editor row: palette | canvas | properties */}
      <div className="flex gap-3 items-start">

        {/* ── Left palette ─────────────────────────────────────── */}
        <div className="w-44 flex-shrink-0 border border-border-subtle rounded bg-surface-2 overflow-hidden select-none">
          {/* Select tool */}
          <button
            onClick={() => { setMode('select'); setSelectedId(null) }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-border-subtle transition-colors ${
              mode === 'select' ? 'bg-accent-primary/20 text-accent-primary font-medium' : 'text-text-muted hover:text-text-primary hover:bg-surface-1'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L7 13.5L9.5 9L14 6.5L2 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Select
            <span className="ml-auto text-xs opacity-40">Esc</span>
          </button>

          {/* Categories */}
          {categorized.map(({ cat, items }) => (
            <div key={cat}>
              <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-1/60 border-b border-border-subtle">
                {cat}
              </div>
              {items.map((def) => {
                const isActive = mode === 'place' && placeType === def.type
                return (
                  <button
                    key={def.type}
                    onClick={() => activatePlaceType(def.type)}
                    title={def.isPoint ? 'Click to place · Drag to resize' : 'Drag to draw'}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors border-b border-border-subtle/40 last:border-b-0 ${
                      isActive
                        ? 'bg-surface-1 text-text-primary font-medium'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-1/60'
                    }`}
                  >
                    <PaletteIcon type={def.type} color={isActive ? def.color : def.color + '99'}/>
                    <span>{def.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: def.color }}/>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {/* Hint */}
          <div className="px-3 py-2 text-xs text-text-muted opacity-60 border-t border-border-subtle">
            Del key removes selected
          </div>
        </div>

        {/* ── Canvas ───────────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 border border-border-subtle rounded bg-neutral-950 overflow-hidden"
          style={{ cursor: mode === 'place' ? 'crosshair' : 'default', minHeight: 320 }}
        >
          {!hasContent ? (
            <label className="flex flex-col items-center justify-center h-80 gap-2 cursor-pointer text-text-muted hover:text-text-primary transition-colors">
              <input type="file" accept="image/*" onChange={onBgUpload} className="sr-only"/>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <span className="text-sm">Upload a floor plan image to get started</span>
              <span className="text-xs opacity-50">PNG, JPG, or SVG</span>
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
              {bgImage && <image href={bgImage} width={vw} height={vh}/>}

              {zones.map((z) => {
                const isSel = selectedId === z.svgElementId
                const hpts = zoneHandles(z)
                const hitPad = (z.width < 24 || z.height < 24) ? 10 : 0
                return (
                  <g key={z.svgElementId}>
                    {/* Visual */}
                    <ZoneGraphic z={z} isSel={isSel}/>
                    {/* Label */}
                    {z.label && (
                      <text
                        x={z.x + z.width / 2} y={z.y + z.height / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={z.fill} fontSize={Math.min(11, z.height * 0.22, z.width * 0.15)}
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {z.label}
                      </text>
                    )}
                    {/* Resize handles */}
                    {isSel && (Object.entries(hpts) as [Handle, { x: number; y: number }][]).map(([h, p]) => (
                      <rect key={h} data-handle={h} data-zone={z.svgElementId}
                        x={p.x - HANDLE_SIZE / 2} y={p.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE}
                        fill="white" stroke={z.fill} strokeWidth={1.5} rx={1}
                        style={{ cursor: HANDLE_CURSOR[h] }}
                      />
                    ))}
                    {/* Transparent hit rect (on top, catches clicks) */}
                    <rect
                      data-hit={z.svgElementId}
                      x={z.x - hitPad} y={z.y - hitPad}
                      width={z.width + hitPad * 2} height={z.height + hitPad * 2}
                      fill="transparent"
                      style={{ cursor: mode === 'select' ? 'move' : 'default' }}
                    />
                  </g>
                )
              })}

              {/* Rubber-band preview */}
              {drawRect && drawRect.w > 0 && drawRect.h > 0 && (
                <rect
                  x={drawRect.x} y={drawRect.y} width={drawRect.w} height={drawRect.h}
                  fill={TYPE_COLOR[placeType]} fillOpacity={0.15}
                  stroke={TYPE_COLOR[placeType]} strokeWidth={2} strokeDasharray="5 3"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>
          )}
        </div>

        {/* ── Properties panel ─────────────────────────────────── */}
        {selectedZone ? (
          <div className="w-60 flex-shrink-0 border border-border-subtle rounded bg-surface-2 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                <PaletteIcon type={selectedZone.objectType} color={selectedZone.fill}/>
                {OBJECT_DEFS.find(d => d.type === selectedZone.objectType)?.label}
              </h3>
              <button onClick={() => del(selectedZone.svgElementId)} className="text-xs text-critical hover:underline">Delete</button>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Label</label>
              <input
                value={selectedZone.label}
                onChange={(e) => {
                  const label = e.target.value
                  if (selectedZone.svgElementId.startsWith('zone-new-') && label) {
                    const newId = slugify(label)
                    setZones((prev) => prev.map((z) => z.svgElementId === selectedZone.svgElementId ? { ...z, label, svgElementId: newId } : z))
                    setSelectedId(newId); return
                  }
                  patch(selectedZone.svgElementId, { label })
                }}
                className="form-input text-sm w-full"
                placeholder="e.g. Ember Room"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select
                value={selectedZone.objectType}
                onChange={(e) => changeType(selectedZone.svgElementId, e.target.value as ZoneType)}
                className="form-input text-sm w-full"
              >
                {OBJECT_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Zone ID</label>
              <input
                value={selectedZone.svgElementId}
                onChange={(e) => changeId(selectedZone.svgElementId, e.target.value)}
                className="form-input text-xs w-full font-mono"
                placeholder="zone-room-01"
              />
            </div>

            {selectedZone.objectType === 'room' && rooms.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Link to Room</label>
                <select
                  value={selectedZone.roomId ?? ''}
                  onChange={(e) => patch(selectedZone.svgElementId, { roomId: e.target.value || null })}
                  className="form-input text-sm w-full"
                >
                  <option value="">— unlinked —</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                </select>
              </div>
            )}

            {['amenity', 'zone_boundary', 'locker_bank', 'access_reader'].includes(selectedZone.objectType) && accessZones.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Link to Access Zone</label>
                <select
                  value={selectedZone.accessZoneId ?? ''}
                  onChange={(e) => patch(selectedZone.svgElementId, { accessZoneId: e.target.value || null })}
                  className="form-input text-sm w-full"
                >
                  <option value="">— unlinked —</option>
                  {accessZones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-text-muted pt-1 border-t border-border-subtle">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: selectedZone.fill }}/>
              {Math.round(selectedZone.x)},{Math.round(selectedZone.y)} · {Math.round(selectedZone.width)}×{Math.round(selectedZone.height)}
            </div>
          </div>
        ) : mode === 'place' ? (
          <div className="w-60 flex-shrink-0 border border-dashed border-border-subtle rounded p-5 flex flex-col items-center justify-center text-center gap-3">
            <PaletteIcon type={placeType} color={TYPE_COLOR[placeType]}/>
            <div>
              <p className="text-sm font-medium text-text-primary">{OBJECT_DEFS.find(d => d.type === placeType)?.label}</p>
              <p className="text-xs text-text-muted mt-1">
                {OBJECT_DEFS.find(d => d.type === placeType)?.isPoint
                  ? 'Click to place · Drag to resize'
                  : 'Drag on the map to draw'}
              </p>
            </div>
            <kbd className="text-xs px-2 py-0.5 rounded bg-surface-1 text-text-muted border border-border-subtle">Esc</kbd>
          </div>
        ) : null}
      </div>

      {/* Zone list */}
      {zones.length > 0 && (
        <div className="border border-border-subtle rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted bg-surface-2 border-b border-border-subtle">
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Label</th>
                <th className="text-left px-3 py-2">Linked</th>
                <th className="px-3 py-2"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {zones.map((z) => {
                const def = OBJECT_DEFS.find(d => d.type === z.objectType)
                return (
                  <tr
                    key={z.svgElementId}
                    className={`cursor-pointer hover:bg-surface-2 transition-colors ${selectedId === z.svgElementId ? 'bg-surface-2' : ''}`}
                    onClick={() => setSelectedId(z.svgElementId)}
                  >
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <PaletteIcon type={z.objectType} color={z.fill}/>
                        <span className="text-xs text-text-muted">{def?.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">{z.label || <span className="text-text-muted italic text-xs">unlabelled</span>}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {z.roomId ? (rooms.find(r => r.id === z.roomId)?.name ?? 'room') : z.accessZoneId ? (accessZones.find(az => az.id === z.accessZoneId)?.name ?? 'zone') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); del(z.svgElementId) }} className="text-xs text-critical hover:underline">Del</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
