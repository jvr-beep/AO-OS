export class BookingAddOnResponseDto {
  id: string;
  add_on_code: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

export class BookingResponseDto {
  id: string;
  guest_id: string;
  tier_id: string;
  tier_name: string;
  product_type: string;
  booking_channel: string;
  booking_date: string;
  arrival_window_start: string;
  arrival_window_end: string;
  duration_minutes: number;
  status: string;
  quoted_price_cents: number;
  paid_amount_cents: number;
  balance_due_cents: number;
  booking_code: string;
  qr_token: string | null;
  expects_existing_band: boolean;
  version: number;
  add_ons: BookingAddOnResponseDto[];
  created_at: string;
  updated_at: string;
}
