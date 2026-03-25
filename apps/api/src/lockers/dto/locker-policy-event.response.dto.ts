export class LockerPolicyEventResponseDto {
  id!: string;
  memberId?: string;
  lockerId?: string;
  visitSessionId?: string;
  staffUserId?: string;
  siteId?: string;
  requestedZoneId?: string;
  requestedLockerId?: string;
  assignmentMode!: "day_use_shared" | "assigned" | "premium" | "staff_override";
  decision!: "allow" | "deny";
  reasonCode!: string;
  eligibleLockerIds!: string[];
  chosenLockerId?: string;
  correlationId?: string;
  createdAt!: string;
}
