import { WristbandStatus } from "@prisma/client";

export class WristbandResponseDto {
  id!: string;
  uid!: string;
  locationId?: string | null;
  status!: WristbandStatus;
  createdAt!: string;
  updatedAt!: string;
}
