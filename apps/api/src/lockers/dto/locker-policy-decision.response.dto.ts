export class LockerPolicyDecisionResponseDto {
  decision!: "allow" | "deny";
  reasonCode!: string;
  eligibleLockerIds!: string[];
  chosenLockerId?: string;
  assignmentMode!: "day_use_shared" | "assigned" | "premium" | "staff_override";
  policySnapshot!: Record<string, unknown>;
}
