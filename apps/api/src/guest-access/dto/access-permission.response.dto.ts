export class AccessPermissionResponseDto {
  id: string;
  wristband_id: string;
  visit_id: string;
  zone_code: string;
  permission_status: string;
  valid_from: string;
  valid_until: string;
  revoked_at: string | null;
  created_at: string;
}

export class GuestAccessEventResponseDto {
  id: string;
  wristband_id: string | null;
  visit_id: string | null;
  reader_id: string;
  zone_code: string;
  access_result: string;
  denial_reason: string | null;
  event_time: string;
}
