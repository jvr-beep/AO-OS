export class CreateRoomAccessDto {
  roomId!: string;
  wristbandId!: string;
  eventType!: "unlock" | "lock" | "open" | "close" | "check_in_gate" | "check_out_gate";
  occurredAt!: string;
  sourceType?: "wristband_reader" | "staff_console" | "system";
  sourceReference?: string;
}
