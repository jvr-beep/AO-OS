export class LockerAssignmentResponseDto {
  id!: string;
  lockerId!: string;
  memberId!: string;
  wristbandAssignmentId?: string;
  assignedByStaffUserId?: string;
  assignedAt!: string;
  unassignedAt?: string;
  unassignedReason?: string;
  active!: boolean;
}
