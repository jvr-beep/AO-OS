export class WristbandAssignmentResponseDto {
  id!: string;
  wristbandId!: string;
  memberId!: string;
  assignedByStaffUserId?: string | null;
  assignedAt!: string;
  unassignedAt?: string | null;
  unassignedReason?: string | null;
  active!: boolean;
}
