export class SystemExceptionResponseDto {
  id: string;
  exception_type: string;
  severity: string;
  status: string;
  visit_id: string | null;
  booking_id: string | null;
  folio_id: string | null;
  resource_id: string | null;
  wristband_id: string | null;
  payload: unknown;
  created_at: string;
  resolved_at: string | null;
}
