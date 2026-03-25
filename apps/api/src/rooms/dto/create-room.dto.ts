export class CreateRoomDto {
  locationId!: string;
  floorPlanAreaId!: string;
  code!: string;
  name!: string;
  roomType!: "private" | "premium_private" | "retreat" | "ritual" | "accessible" | "couples_reserved_future";
  privacyLevel!: "standard" | "high" | "premium";
  status?: "available" | "booked" | "occupied" | "cleaning" | "out_of_service";
  active?: boolean;
  bookable?: boolean;
  cleaningRequired?: boolean;
}
