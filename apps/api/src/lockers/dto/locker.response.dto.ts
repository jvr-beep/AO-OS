export class LockerResponseDto {
  id!: string;
  code!: string;
  locationId?: string;
  status!: "available" | "assigned" | "out_of_service";
  activeAssignmentId?: string;
  assignedMemberId?: string;
  wristbandAssignmentId?: string;
  assignedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}
