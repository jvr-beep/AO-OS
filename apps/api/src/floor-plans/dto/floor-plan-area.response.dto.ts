export class FloorPlanAreaResponseDto {
  id!: string;
  floorPlanId!: string;
  code!: string;
  name!: string;
  areaType!: "room" | "corridor" | "entry" | "service" | "bath" | "lounge" | "locker_bank";
  x!: string;
  y!: string;
  width!: string;
  height!: string;
  active!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
