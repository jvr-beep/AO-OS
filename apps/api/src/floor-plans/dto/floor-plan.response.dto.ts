import { FloorPlanAreaResponseDto } from "./floor-plan-area.response.dto";

export class FloorPlanResponseDto {
  id!: string;
  locationId!: string;
  name!: string;
  active!: boolean;
  createdAt!: string;
  updatedAt!: string;
  areas!: FloorPlanAreaResponseDto[];
}
