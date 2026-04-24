export class ScanDecisionResponseDto {
  attemptId!: string;
  decision!: "allowed" | "denied";
  signal?: "open_door";
  denialReasonCode?: string;
  memberId?: string;
  guestId?: string;
  accessZoneId?: string;
}
