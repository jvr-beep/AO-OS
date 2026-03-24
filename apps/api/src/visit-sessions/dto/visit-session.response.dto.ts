import { VisitStatus } from "@prisma/client";

export class VisitSessionResponseDto {
  id!: string;
  memberId!: string;
  locationId!: string;
  wristbandAssignmentId?: string | null;
  checkInAt!: string;
  checkOutAt?: string | null;
  status!: VisitStatus;
  createdAt!: string;
}
