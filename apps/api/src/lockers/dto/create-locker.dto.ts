export class CreateLockerDto {
  code!: string;
  locationId?: string;
  vendorLockId?: string;
  zoneId?: string;
  bankId?: string;
  wallId?: string;
  lockerLabel?: string;
  lockerSize?: string;
  lockerType?: string;
  isAccessible?: boolean;
  isWetAreaRated?: boolean;
  hasPower?: boolean;
  tierClass?: string;
  supportsDayUse?: boolean;
  supportsAssignedUse?: boolean;
  active?: boolean;
  status?:
    | "available"
    | "reserved"
    | "occupied"
    | "out_of_service"
    | "cleaning"
    | "maintenance"
    | "offline"
    | "forced_open"
    | "assigned";
}
