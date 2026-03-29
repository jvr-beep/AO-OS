export class FolioLineItemResponseDto {
  id: string;
  line_type: string;
  reference_code: string | null;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  metadata: unknown;
  created_at: string;
}

export class PaymentTransactionResponseDto {
  id: string;
  payment_provider: string;
  provider_payment_intent_id: string | null;
  transaction_type: string;
  amount_cents: number;
  status: string;
  card_brand: string | null;
  card_last4: string | null;
  idempotency_key: string | null;
  provider_response: unknown;
  created_at: string;
}

export class FolioResponseDto {
  id: string;
  visit_id: string;
  subtotal_cents: number;
  taxes_cents: number;
  fees_cents: number;
  wristband_charge_cents: number;
  add_on_total_cents: number;
  discounts_cents: number;
  total_due_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  payment_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  line_items: FolioLineItemResponseDto[];
  payment_transactions: PaymentTransactionResponseDto[];
}
