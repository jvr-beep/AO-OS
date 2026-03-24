import { AccessDecision } from "@prisma/client";

export class CreateAccessAttemptDto {
  memberId?: string;
  wristbandId?: string;
  accessPointId!: string;
  accessZoneId!: string;
  attemptSource?: string;
  decision!: AccessDecision;
  denialReasonCode?: string;
  occurredAt!: string;
}
