export class VisitStatusHistoryEntryDto {
  id: string;
  visit_id: string;
  previous_status: string | null;
  new_status: string;
  reason_code: string | null;
  reason_text: string | null;
  changed_by_user_id: string | null;
  changed_at: string;
}

export class VisitResponseDto {
  id: string;
  guest_id: string;
  booking_id: string | null;
  source_type: string;
  product_type: string;
  tier_id: string;
  duration_minutes: number;
  status: string;
  start_time: string | null;
  scheduled_end_time: string | null;
  actual_end_time: string | null;
  assigned_resource_id: string | null;
  assigned_band_id: string | null;
  waiver_required: boolean;
  waiver_completed: boolean;
  payment_status: string;
  check_in_channel: string | null;
  check_out_channel: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
