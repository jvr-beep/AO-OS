import { AccessDecision } from "@prisma/client";

export class AccessAttemptResponseDto {
  id!: string;
  memberId?: string | null;
  wristbandId?: string | null;
  accessPointId!: string;
  accessZoneId!: string;
  attemptSource?: string | null;
  decision!: AccessDecision;
  denialReasonCode?: string | null;
  occurredAt!: string;
}
