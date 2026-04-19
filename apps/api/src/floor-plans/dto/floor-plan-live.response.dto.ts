export class LiveVisitDto {
  visitId!: string
  guestName!: string
  tierName!: string
  scheduledEndTime!: string | null
  durationMinutes!: number
}

export class LiveAreaDto {
  id!: string
  code!: string
  name!: string
  areaType!: string
  x!: string
  y!: string
  width!: string
  height!: string
  /** Number of active visits currently in this zone */
  occupancy!: number
  /** Cleaning status for this area: null if no open task */
  cleaningStatus!: string | null
  /** RFID reader health inferred from last 5 min of events */
  rfidStatus!: 'online' | 'degraded' | 'unknown'
  /** Active visits with access to this zone */
  activeVisits!: LiveVisitDto[]
}

export class FloorPlanLiveResponseDto {
  id!: string
  name!: string
  locationId!: string
  fetchedAt!: string
  areas!: LiveAreaDto[]
}
