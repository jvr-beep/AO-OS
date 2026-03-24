import { VisitStatus } from "@prisma/client";

export class CreateVisitSessionDto {
  memberId!: string;
  locationId!: string;
  wristbandAssignmentId?: string;
  checkInAt!: string;
}
