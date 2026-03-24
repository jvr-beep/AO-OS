export class CreateAccessAttemptDto {
  memberId?: string;
  wristbandId?: string;
  accessPointId!: string;
  accessZoneId!: string;
  attemptSource?: string;
  occurredAt!: string;
}
