'use client'

import { useMemo, useState } from 'react'
import {
  countRoomStates,
  describeRoomState,
  type AccessNode,
  type Device,
  type DeviceStatus,
  type FacilityFloorMap,
  type FacilityZone,
  type RoomOperationalState,
} from '@/lib/facility-floor-map'

type FacilityFloorExplorerProps = {
  floor: FacilityFloorMap
}

const roomStateStyles: Record<RoomOperationalState, string> = {
  ready: '#2f8f83',
  reserved: '#d3a640',
  in_use: '#cf6f52',
  turnover: '#5f7dd8',
  out_of_service: '#8c4d63',
  unknown: '#5c6775',
}

const zoneStyles: Record<FacilityZone['type'], { fill: string; stroke: string }> = {
  room: { fill: '#243848', stroke: '#80b8af' },
  corridor: { fill: '#1f2a35', stroke: '#4f6275' },
  entry: { fill: '#24473e', stroke: '#83d0c1' },
  service: { fill: '#3a2f25', stroke: '#d3a67c' },
  bath: { fill: '#2f3654', stroke: '#91a7ff' },
  lounge: { fill: '#3d3245', stroke: '#c39acf' },
  locker_bank: { fill: '#30331f', stroke: '#b5be76' },
}

const deviceStatusStyles: Record<DeviceStatus, string> = {
  online: '#4ed8b0',
  degraded: '#f4c45d',
  offline: '#ff7d7d',
}

function toSvgPoints(points: FacilityZone['polygon']) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function polygonCenter(points: FacilityZone['polygon']) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  }
}

function isRoomZone(zone: FacilityZone) {
  return zone.type === 'room'
}

function renderNodeGlyph(node: AccessNode) {
  switch (node.type) {
    case 'entry':
      return 'E'
    case 'camera':
      return 'C'
    case 'service_point':
      return 'S'
    default:
      return 'R'
  }
}

function renderDeviceGlyph(device: Device) {
  switch (device.type) {
    case 'camera':
      return 'C'
    case 'environmental':
      return 'A'
    case 'reader':
      return 'R'
    default:
      return 'D'
  }
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function FacilityFloorExplorer({ floor }: FacilityFloorExplorerProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(floor.zones[0]?.id ?? null)

  const roomStateCounts = useMemo(() => countRoomStates(floor.zones), [floor.zones])
  const selectedZone = floor.zones.find((zone) => zone.id === selectedZoneId) ?? floor.zones[0] ?? null
  const selectedZoneNodes = floor.accessNodes.filter((node) => node.zoneId === selectedZone?.id)
  const selectedZoneDevices = floor.devices.filter((device) => device.zoneId === selectedZone?.id)
  const mappedRooms = floor.zones.filter(isRoomZone)

  return (
    <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
      <section className="card overflow-hidden p-0">
        <div className="border-b border-border-subtle px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Facility Mapping</p>
              <h2 className="mt-2 text-lg font-semibold text-text-primary">{floor.levelLabel}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Source plan: {floor.sourcePlanName} · {mappedRooms.length} mapped rooms · {floor.accessNodes.length} access nodes
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-text-muted">
                {floor.topologyMode === 'persisted' ? 'Persisted topology' : 'Derived topology'} · last refresh {formatTimestamp(floor.refreshedAt)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary sm:grid-cols-3">
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">Ready</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.ready}</div>
              </div>
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">Reserved</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.reserved}</div>
              </div>
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">In Use</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.in_use}</div>
              </div>
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">Turnover</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.turnover}</div>
              </div>
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">Out</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.out_of_service}</div>
              </div>
              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                <div className="text-text-muted">Unknown</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">{roomStateCounts.unknown}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-border-subtle bg-[radial-gradient(circle_at_top,rgba(47,143,131,0.12),transparent_40%),linear-gradient(180deg,rgba(15,22,32,0.98),rgba(7,10,14,1))] p-3">
            <svg viewBox="0 0 100 100" className="aspect-[16/10] w-full rounded-lg border border-border-subtle bg-surface-0">
              <defs>
                <pattern id="facility-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.25" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#facility-grid)" />

              {floor.zones.map((zone) => {
                const center = polygonCenter(zone.polygon)
                const palette = zone.type === 'room' && zone.roomState
                  ? { fill: roomStateStyles[zone.roomState], stroke: '#e8eee9' }
                  : zoneStyles[zone.type]
                const isSelected = zone.id === selectedZone?.id

                return (
                  <g key={zone.id} onClick={() => setSelectedZoneId(zone.id)} className="cursor-pointer">
                    <polygon
                      points={toSvgPoints(zone.polygon)}
                      fill={palette.fill}
                      fillOpacity={isSelected ? 0.9 : 0.68}
                      stroke={palette.stroke}
                      strokeWidth={isSelected ? 0.9 : 0.45}
                    />
                    <text
                      x={center.x}
                      y={center.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="3.1"
                      fill="#f7f5f0"
                      style={{ pointerEvents: 'none', letterSpacing: '0.08em' }}
                    >
                      {zone.code}
                    </text>
                  </g>
                )
              })}

              {floor.accessNodes.map((node) => (
                <g key={node.id} onClick={() => node.zoneId && setSelectedZoneId(node.zoneId)} className="cursor-pointer">
                  <circle cx={node.position.x} cy={node.position.y} r="2.05" fill="#091018" stroke={deviceStatusStyles[node.status]} strokeWidth="0.55" />
                  <text
                    x={node.position.x}
                    y={node.position.y + 0.2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2.2"
                    fill="#edf2ef"
                    style={{ pointerEvents: 'none' }}
                  >
                    {renderNodeGlyph(node)}
                  </text>
                </g>
              ))}

              {floor.devices.map((device) => (
                <g key={device.id} onClick={() => device.zoneId && setSelectedZoneId(device.zoneId)} className="cursor-pointer">
                  <rect
                    x={device.position.x - 1.45}
                    y={device.position.y - 1.45}
                    width="2.9"
                    height="2.9"
                    rx="0.65"
                    fill="#0d141c"
                    stroke={deviceStatusStyles[device.status]}
                    strokeWidth="0.45"
                  />
                  <text
                    x={device.position.x}
                    y={device.position.y + 0.1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="1.8"
                    fill="#edf2ef"
                    style={{ pointerEvents: 'none' }}
                  >
                    {renderDeviceGlyph(device)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="rounded-full border border-border-subtle px-2 py-1">Zones: {floor.zones.length}</span>
            <span className="rounded-full border border-border-subtle px-2 py-1">Nodes: {floor.accessNodes.length}</span>
            <span className="rounded-full border border-border-subtle px-2 py-1">Devices: {floor.devices.length}</span>
            <span className="rounded-full border border-border-subtle px-2 py-1">Location: {floor.locationId}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="card">
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Inspector</p>
          {selectedZone ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-text-primary">{selectedZone.code}</h3>
                  <span className="rounded-full border border-border-subtle px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                    {selectedZone.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{selectedZone.name}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                  <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">State</dt>
                  <dd className="mt-1 text-text-primary">{describeRoomState(selectedZone.roomState)}</dd>
                </div>
                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                  <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">Room Type</dt>
                  <dd className="mt-1 text-text-primary">{selectedZone.roomType?.replaceAll('_', ' ') ?? 'N/A'}</dd>
                </div>
                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                  <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">Room ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-text-primary">{selectedZone.roomId ?? 'Not linked'}</dd>
                </div>
                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-2">
                  <dt className="text-xs uppercase tracking-[0.2em] text-text-muted">Area Source</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-text-primary">{selectedZone.sourceAreaId}</dd>
                </div>
              </dl>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Current Booking</p>
                  {selectedZone.currentBooking ? (
                    <div className="mt-2 text-sm text-text-secondary">
                      <div className="text-text-primary">{selectedZone.currentBooking.status.replaceAll('_', ' ')}</div>
                      <div className="mt-1 font-mono text-xs">{selectedZone.currentBooking.memberId}</div>
                      <div className="mt-2 text-xs">{formatTimestamp(selectedZone.currentBooking.startsAt)} to {formatTimestamp(selectedZone.currentBooking.endsAt)}</div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-text-muted">No active booking in window.</p>
                  )}
                </div>

                <div className="rounded border border-border-subtle bg-surface-1 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Upcoming Booking</p>
                  {selectedZone.upcomingBooking ? (
                    <div className="mt-2 text-sm text-text-secondary">
                      <div className="text-text-primary">{selectedZone.upcomingBooking.status.replaceAll('_', ' ')}</div>
                      <div className="mt-1 font-mono text-xs">{selectedZone.upcomingBooking.memberId}</div>
                      <div className="mt-2 text-xs">{formatTimestamp(selectedZone.upcomingBooking.startsAt)} to {formatTimestamp(selectedZone.upcomingBooking.endsAt)}</div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-text-muted">No upcoming booking queued.</p>
                  )}
                </div>
              </div>

              <div className="rounded border border-border-subtle bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Visit Session</p>
                {selectedZone.activeVisitSession ? (
                  <div className="mt-2 text-sm text-text-secondary">
                    <div className="text-text-primary">{selectedZone.activeVisitSession.status.replaceAll('_', ' ')}</div>
                    <div className="mt-1 font-mono text-xs">{selectedZone.activeVisitSession.memberId}</div>
                    <div className="mt-2 text-xs">Checked in {formatTimestamp(selectedZone.activeVisitSession.checkInAt)}</div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">No active visit session tied to this room right now.</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Access Nodes</p>
                <div className="mt-2 space-y-2">
                  {selectedZoneNodes.length === 0 ? (
                    <p className="text-sm text-text-muted">No access nodes mapped for this zone yet.</p>
                  ) : (
                    selectedZoneNodes.map((node) => (
                      <div key={node.id} className="rounded border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-secondary">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-text-primary">{node.label}</span>
                          <span style={{ color: deviceStatusStyles[node.status] }}>{node.status}</span>
                        </div>
                        {node.detail && <p className="mt-1 text-xs text-text-muted">{node.detail}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Recent Access Events</p>
                <div className="mt-2 space-y-2">
                  {selectedZone.recentAccessEvents.length === 0 ? (
                    <p className="text-sm text-text-muted">No recent room access events.</p>
                  ) : (
                    selectedZone.recentAccessEvents.map((event) => (
                      <div key={event.id} className="rounded border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-secondary">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-text-primary">{event.eventType.replaceAll('_', ' ')}</span>
                          <span>{event.decision}</span>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          {formatTimestamp(event.occurredAt)} · {event.sourceType.replaceAll('_', ' ')}
                        </p>
                        {event.denialReasonCode && <p className="mt-1 text-xs text-[#ffb3b3]">{event.denialReasonCode}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Devices</p>
                <div className="mt-2 space-y-2">
                  {selectedZoneDevices.length === 0 ? (
                    <p className="text-sm text-text-muted">No devices mapped for this zone yet.</p>
                  ) : (
                    selectedZoneDevices.map((device) => (
                      <div key={device.id} className="rounded border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-secondary">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-text-primary">{device.label}</span>
                          <span style={{ color: deviceStatusStyles[device.status] }}>{device.status}</span>
                        </div>
                        {device.detail && <p className="mt-1 text-xs text-text-muted">{device.detail}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">No zones mapped yet.</p>
          )}
        </div>

        <div className="card">
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Zone Register</p>
          <div className="mt-3 space-y-2">
            {floor.zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZoneId(zone.id)}
                className={`w-full rounded border px-3 py-2 text-left transition-colors ${zone.id === selectedZone?.id ? 'border-accent-primary bg-[rgba(47,143,131,0.12)]' : 'border-border-subtle bg-surface-1 hover:border-accent-primary/60'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{zone.code}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{zone.type}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>{zone.name}</span>
                  {zone.roomState && <span>{describeRoomState(zone.roomState)}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}