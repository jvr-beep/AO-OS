export class CreateFloorPlanAreaDto {
  code!: string;
  name!: string;
  areaType!: "room" | "corridor" | "entry" | "service" | "bath" | "lounge" | "locker_bank";
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  active?: boolean;
}
