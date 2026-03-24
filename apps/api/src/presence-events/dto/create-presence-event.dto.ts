export class CreatePresenceEventDto {
  visitSessionId!: string;
  memberId!: string;
  accessZoneId?: string;
  eventType!: string;
  sourceType?: string;
  sourceReference?: string;
  occurredAt!: string;
  payloadJson?: unknown;
}
