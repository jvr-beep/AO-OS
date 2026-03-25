export class ListLockersQueryDto {
  siteId?: string;
  zoneId?: string;
  memberId?: string;
  credentialId?: string;
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
