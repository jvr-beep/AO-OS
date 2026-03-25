export class LockerAccessEventResponseDto {
  id!: string;
  memberId?: string;
  lockerId!: string;
  wristbandId?: string;
  lockerAssignmentId?: string;
  decision!: "allowed" | "denied";
  denialReasonCode?: string;
  eventType!: "unlock" | "lock" | "open" | "close";
  occurredAt!: string;
  sourceReference?: string;
  createdAt!: string;
}
