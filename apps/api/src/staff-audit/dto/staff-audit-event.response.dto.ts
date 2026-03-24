export class StaffAuditEventResponseDto {
  id!: string;
  eventType!: string;
  occurredAt!: string;
  actorStaffUserId!: string;
  actorEmailSnapshot!: string;
  actorRoleSnapshot!: string;
  targetStaffUserId?: string;
  targetEmailSnapshot?: string;
  outcome!: string;
  reasonCode?: string;
  metadataJson?: Record<string, unknown>;
}