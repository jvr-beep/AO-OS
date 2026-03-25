export class LockerAssignmentResponseDto {
  id!: string;
  lockerId!: string;
  memberId!: string;
  visitSessionId?: string;
  wristbandAssignmentId?: string;
  assignmentMode?: "day_use_shared" | "assigned" | "premium" | "staff_override";
  assignedByStaffUserId?: string;
  assignedAt!: string;
  unassignedAt?: string;
  unassignedReason?: string;
  active!: boolean;
}
