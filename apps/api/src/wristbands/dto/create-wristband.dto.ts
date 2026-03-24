import { WristbandStatus } from "@prisma/client";

export class CreateWristbandDto {
  uid!: string;
  locationId?: string;
  status?: WristbandStatus;
}
