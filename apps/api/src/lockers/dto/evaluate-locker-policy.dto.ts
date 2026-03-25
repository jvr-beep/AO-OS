export class EvaluateLockerPolicyDto {
  memberId!: string;
  credentialId!: string;
  siteId!: string;
  sessionId!: string;
  requestMode!: "day_use_shared" | "assigned" | "premium" | "staff_override";
  requestedZoneId?: string;
  requestedLockerId?: string;
  staffOverride?: boolean;
  staffOverrideReason?: string;
  correlationId?: string;
}
