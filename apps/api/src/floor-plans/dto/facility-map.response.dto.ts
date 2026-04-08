export class FacilityPointResponseDto {
  x!: number;
  y!: number;
}

export class FacilityBookingSummaryResponseDto {
  id!: string;
  memberId!: string;
  status!: "reserved" | "checked_in" | "checked_out" | "expired" | "cancelled" | "no_show" | "waitlisted";
  startsAt!: string;
  endsAt!: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export class FacilityVisitSessionSummaryResponseDto {
  id!: string;
  memberId!: string;
  status!: "checked_in" | "checked_out";
  checkInAt!: string;
  checkOutAt?: string;
}

export class FacilityRoomAccessSummaryResponseDto {
  id!: string;
  bookingId?: string;
  memberId?: string;
  decision!: "allowed" | "denied" | "error";
  denialReasonCode?: string;
  eventType!: "unlock" | "lock" | "open" | "close" | "check_in_gate" | "check_out_gate";
  occurredAt!: string;
  sourceType!: "wristband_reader" | "staff_console" | "system";
}

export class FacilityZoneResponseDto {
  id!: string;
  sourceAreaId?: string;
  code!: string;
  name!: string;
  type!: "room" | "corridor" | "entry" | "service" | "bath" | "lounge" | "locker_bank";
  polygon!: FacilityPointResponseDto[];
  roomId?: string;
  roomType?: "private" | "premium_private" | "retreat" | "ritual" | "accessible" | "couples_reserved_future";
  roomState?: "ready" | "reserved" | "in_use" | "turnover" | "out_of_service" | "unknown";
  currentBooking?: FacilityBookingSummaryResponseDto;
  upcomingBooking?: FacilityBookingSummaryResponseDto;
  activeVisitSession?: FacilityVisitSessionSummaryResponseDto;
  recentAccessEvents!: FacilityRoomAccessSummaryResponseDto[];
}

export class FacilityAccessNodeResponseDto {
  id!: string;
  code!: string;
  label!: string;
  type!: "entry" | "reader" | "camera" | "service_point";
  x!: number;
  y!: number;
  zoneId?: string;
  status!: "online" | "offline" | "degraded";
  detail?: string;
}

export class FacilityDeviceResponseDto {
  id!: string;
  code!: string;
  label!: string;
  type!: "door_controller" | "reader" | "camera" | "environmental";
  x!: number;
  y!: number;
  zoneId?: string;
  status!: "online" | "offline" | "degraded";
  detail?: string;
}

export class FacilityMapResponseDto {
  id!: string;
  topologyMode!: "persisted" | "derived";
  facilityId?: string;
  facilityCode?: string;
  facilityName?: string;
  sourcePlanId!: string;
  sourcePlanName!: string;
  locationId!: string;
  levelLabel!: string;
  refreshedAt!: string;
  zones!: FacilityZoneResponseDto[];
  accessNodes!: FacilityAccessNodeResponseDto[];
  devices!: FacilityDeviceResponseDto[];
}