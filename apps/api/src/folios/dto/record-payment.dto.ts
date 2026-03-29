import { Type } from "class-transformer";
import { PaymentTransactionType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from "class-validator";

export class RecordPaymentDto {
  @IsString()
  payment_provider: string;

  @IsEnum(PaymentTransactionType)
  transaction_type: PaymentTransactionType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount_cents: number;

  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  provider_payment_intent_id?: string;

  @IsString()
  @IsOptional()
  card_brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4)
  card_last4?: string;

  @IsString()
  @IsOptional()
  idempotency_key?: string;

  @IsObject()
  @IsOptional()
  provider_response?: Record<string, unknown>;
}
