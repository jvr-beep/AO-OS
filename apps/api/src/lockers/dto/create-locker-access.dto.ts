export class CreateLockerAccessDto {
  lockerId!: string;
  wristbandId!: string;
  eventType!: "unlock" | "lock" | "open" | "close";
  occurredAt!: string;
  sourceReference?: string;
}
