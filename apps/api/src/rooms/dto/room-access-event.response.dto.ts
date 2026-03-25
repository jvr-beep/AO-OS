export class RoomAccessEventResponseDto {
  id!: string;
  bookingId?: string;
  roomId!: string;
  memberId?: string;
  wristbandId?: string;
  decision!: "allowed" | "denied" | "error";
  denialReasonCode?: string;
  eventType!: "unlock" | "lock" | "open" | "close" | "check_in_gate" | "check_out_gate";
  occurredAt!: string;
  sourceType!: "wristband_reader" | "staff_console" | "system";
  sourceReference?: string;
  createdAt!: string;
}
