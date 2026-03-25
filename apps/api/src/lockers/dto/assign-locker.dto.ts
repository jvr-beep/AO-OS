export class AssignLockerDto {
  lockerId!: string;
  memberId!: string;
  siteId?: string;
  visitSessionId?: string;
  assignmentMode?: "day_use_shared" | "assigned" | "premium" | "staff_override";
  requestedZoneId?: string;
  requestedLockerId?: string;
  correlationId?: string;
  staffOverrideReason?: string;
  wristbandAssignmentId?: string;
  assignedByStaffUserId?: string;
}
