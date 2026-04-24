import { WristbandStatus } from "@prisma/client";

export class WristbandResponseDto {
  id!: string;
  uid!: string;
  locationId?: string | null;
  homeLocationId?: string | null;
  status!: WristbandStatus;
  globalAccessFlag!: boolean;
  issuedAt!: string;
  activatedAt?: string | null;
  suspendedAt?: string | null;
  replacedFromWristbandId?: string | null;
  lastSeenLocationId?: string | null;
  lastSeenAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
  assignmentId?: string | null;
  memberId?: string | null;
  memberAlias?: string | null;
}
