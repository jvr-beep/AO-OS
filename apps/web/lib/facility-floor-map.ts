import type { FacilityFloorMapResponse, FloorPlan, FloorPlanArea, Room } from '@/types/api'

export type NormalizedPoint = {
  x: number
  y: number
}

export type RoomOperationalState = 'ready' | 'reserved' | 'in_use' | 'turnover' | 'out_of_service' | 'unknown'

export type FacilityZoneType =
  | 'room'
  | 'corridor'
  | 'entry'
  | 'service'
  | 'bath'
  | 'lounge'
  | 'locker_bank'

export type AccessNodeType = 'entry' | 'reader' | 'camera' | 'service_point'
export type DeviceType = 'door_controller' | 'reader' | 'camera' | 'environmental'
export type DeviceStatus = 'online' | 'offline' | 'degraded'

export type FacilityZone = {
  id: string
  sourceAreaId: string
  code: string
  name: string
  type: FacilityZoneType
  polygon: NormalizedPoint[]
  roomId?: string
  roomType?: Room['roomType']
  roomState?: RoomOperationalState
  currentBooking?: {
    id: string
    memberId: string
    status: 'reserved' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled' | 'no_show' | 'waitlisted'
    startsAt: string
    endsAt: string
    checkedInAt?: string
    checkedOutAt?: string
  }
  upcomingBooking?: {
    id: string
    memberId: string
    status: 'reserved' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled' | 'no_show' | 'waitlisted'
    startsAt: string
    endsAt: string
    checkedInAt?: string
    checkedOutAt?: string
  }
  activeVisitSession?: {
    id: string
    memberId: string
    status: 'checked_in' | 'checked_out'
    checkInAt: string
    checkOutAt?: string
  }
  recentAccessEvents: {
    id: string
    bookingId?: string
    memberId?: string
    decision: 'allowed' | 'denied' | 'error'
    denialReasonCode?: string
    eventType: 'unlock' | 'lock' | 'open' | 'close' | 'check_in_gate' | 'check_out_gate'
    occurredAt: string
    sourceType: 'wristband_reader' | 'staff_console' | 'system'
  }[]
}

export type AccessNode = {
  id: string
  label: string
  type: AccessNodeType
  position: NormalizedPoint
  zoneId?: string
  status: DeviceStatus
  detail?: string
}

export type Device = {
  id: string
  label: string
  type: DeviceType
  position: NormalizedPoint
  zoneId?: string
  status: DeviceStatus
  detail?: string
}

export type FacilityFloorMap = {
  id: string
  topologyMode: 'persisted' | 'derived'
  facilityId?: string
  facilityCode?: string
  facilityName?: string
  sourcePlanId: string
  sourcePlanName: string
  locationId: string
  levelLabel: string
  refreshedAt: string
  zones: FacilityZone[]
  accessNodes: AccessNode[]
  devices: Device[]
}

function clampCoordinate(value: number) {
  return Math.min(100, Math.max(0, value))
}

function parsePercent(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? clampCoordinate(parsed) : 0
}

function rectangleToPolygon(area: FloorPlanArea): NormalizedPoint[] {
  const left = parsePercent(area.x)
  const top = parsePercent(area.y)
  const width = parsePercent(area.width)
  const height = parsePercent(area.height)
  const right = clampCoordinate(left + width)
  const bottom = clampCoordinate(top + height)

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ]
}

function centerOfPolygon(points: NormalizedPoint[]) {
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

function mapRoomState(room?: Room): RoomOperationalState | undefined {
  if (!room) {
    return undefined
  }

  switch (room.status) {
    case 'available':
      return 'ready'
    case 'booked':
      return 'reserved'
    case 'occupied':
      return 'in_use'
    case 'cleaning':
      return 'turnover'
    case 'out_of_service':
      return 'out_of_service'
    default:
      return 'unknown'
  }
}

function mapDeviceStatus(roomState?: RoomOperationalState): DeviceStatus {
  switch (roomState) {
    case 'out_of_service':
      return 'offline'
    case 'turnover':
      return 'degraded'
    case 'ready':
    case 'reserved':
    case 'in_use':
      return 'online'
    default:
      return 'degraded'
  }
}

function buildAccessNodeForZone(zone: FacilityZone): AccessNode | null {
  const center = centerOfPolygon(zone.polygon)

  if (zone.type === 'entry') {
    return {
      id: `${zone.id}-entry`,
      label: `${zone.code} ingress`,
      type: 'entry',
      position: center,
      zoneId: zone.id,
      status: 'online',
      detail: 'Primary guest ingress and threshold.',
    }
  }

  if (zone.type === 'room') {
    return {
      id: `${zone.id}-reader`,
      label: `${zone.code} reader`,
      type: 'reader',
      position: { x: Math.max(2, center.x - 3.5), y: center.y },
      zoneId: zone.id,
      status: mapDeviceStatus(zone.roomState),
      detail: 'Credential check before room entry.',
    }
  }

  if (zone.type === 'service') {
    return {
      id: `${zone.id}-service-point`,
      label: `${zone.code} ops point`,
      type: 'service_point',
      position: center,
      zoneId: zone.id,
      status: 'online',
      detail: 'Operations and support touchpoint.',
    }
  }

  return null
}

function buildDeviceForZone(zone: FacilityZone): Device | null {
  const center = centerOfPolygon(zone.polygon)

  if (zone.type === 'room') {
    return {
      id: `${zone.id}-controller`,
      label: `${zone.code} controller`,
      type: 'door_controller',
      position: { x: Math.min(98, center.x + 3.5), y: center.y },
      zoneId: zone.id,
      status: mapDeviceStatus(zone.roomState),
      detail: zone.roomState ? `Room state: ${zone.roomState.replaceAll('_', ' ')}` : 'Awaiting room state',
    }
  }

  if (zone.type === 'corridor' || zone.type === 'entry') {
    return {
      id: `${zone.id}-camera`,
      label: `${zone.code} camera`,
      type: 'camera',
      position: { x: center.x, y: Math.max(2, center.y - 4) },
      zoneId: zone.id,
      status: 'online',
      detail: 'Visibility over shared circulation space.',
    }
  }

  return null
}

function sortZones(zones: FacilityZone[]) {
  return [...zones].sort((left, right) => left.code.localeCompare(right.code))
}

export function buildFacilityFloorMap(plan: FloorPlan, rooms: Room[]): FacilityFloorMap {
  const roomByAreaId = new Map(rooms.map((room) => [room.floorPlanAreaId, room]))

  const zones = sortZones(
    plan.areas.map((area) => {
      const room = roomByAreaId.get(area.id)
      return {
        id: `zone-${area.id}`,
        sourceAreaId: area.id,
        code: area.code,
        name: area.name,
        type: area.areaType,
        polygon: rectangleToPolygon(area),
        roomId: room?.id,
        roomType: room?.roomType,
        roomState: mapRoomState(room),
        recentAccessEvents: [],
      }
    }),
  )

  const accessNodes = zones
    .map(buildAccessNodeForZone)
    .filter((node): node is AccessNode => node !== null)

  const devices = zones
    .map(buildDeviceForZone)
    .filter((device): device is Device => device !== null)

  return {
    id: `facility-floor-${plan.id}`,
    topologyMode: 'derived',
    sourcePlanId: plan.id,
    sourcePlanName: plan.name,
    locationId: plan.locationId,
    levelLabel: inferLevelLabel(plan.name),
    refreshedAt: new Date().toISOString(),
    zones,
    accessNodes,
    devices,
  }
}

export function mapFacilityFloorApiToViewModel(response: FacilityFloorMapResponse): FacilityFloorMap {
  return {
    id: response.id,
    topologyMode: response.topologyMode,
    facilityId: response.facilityId,
    facilityCode: response.facilityCode,
    facilityName: response.facilityName,
    sourcePlanId: response.sourcePlanId,
    sourcePlanName: response.sourcePlanName,
    locationId: response.locationId,
    levelLabel: response.levelLabel,
    refreshedAt: response.refreshedAt,
    zones: response.zones.map((zone) => ({
      id: zone.id,
      sourceAreaId: zone.sourceAreaId ?? '',
      code: zone.code,
      name: zone.name,
      type: zone.type,
      polygon: zone.polygon,
      roomId: zone.roomId,
      roomType: zone.roomType,
      roomState: zone.roomState,
      currentBooking: zone.currentBooking,
      upcomingBooking: zone.upcomingBooking,
      activeVisitSession: zone.activeVisitSession,
      recentAccessEvents: zone.recentAccessEvents,
    })),
    accessNodes: response.accessNodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      position: { x: node.x, y: node.y },
      zoneId: node.zoneId,
      status: node.status,
      detail: node.detail,
    })),
    devices: response.devices.map((device) => ({
      id: device.id,
      label: device.label,
      type: device.type,
      position: { x: device.x, y: device.y },
      zoneId: device.zoneId,
      status: device.status,
      detail: device.detail,
    })),
  }
}

function inferLevelLabel(name: string) {
  const normalizedName = name.trim().toLowerCase()

  if (normalizedName.includes('main')) {
    return 'Main Floor'
  }

  if (normalizedName.includes('lower')) {
    return 'Lower Level'
  }

  if (normalizedName.includes('upper')) {
    return 'Upper Level'
  }

  return name
}

export function describeRoomState(roomState?: RoomOperationalState) {
  if (!roomState) {
    return 'No live room state'
  }

  return roomState.replaceAll('_', ' ')
}

export function countRoomStates(zones: FacilityZone[]) {
  const counts: Record<RoomOperationalState, number> = {
    ready: 0,
    reserved: 0,
    in_use: 0,
    turnover: 0,
    out_of_service: 0,
    unknown: 0,
  }

  for (const zone of zones) {
    if (zone.type !== 'room') {
      continue
    }

    counts[zone.roomState ?? 'unknown'] += 1
  }

  return counts
}