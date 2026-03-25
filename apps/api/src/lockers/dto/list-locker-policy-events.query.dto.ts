export class ListLockerPolicyEventsQueryDto {
  siteId?: string;
  memberId?: string;
  sessionId?: string;
  decision?: "allow" | "deny";
  limit?: string;
}
