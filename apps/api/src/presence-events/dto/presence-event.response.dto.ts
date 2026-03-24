export class PresenceEventResponseDto {
  id!: string;
  visitSessionId!: string;
  memberId!: string;
  accessZoneId?: string | null;
  eventType!: string;
  sourceType?: string | null;
  sourceReference?: string | null;
  occurredAt!: string;
  payloadJson?: unknown;
}
