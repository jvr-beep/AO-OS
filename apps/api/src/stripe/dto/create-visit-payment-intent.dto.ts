import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional } from "class-validator";

export class CreateVisitPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  visitId: string;

  @IsString()
  @IsNotEmpty()
  guestId: string;

  @IsString()
  @IsNotEmpty()
  tierCode: string;

  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
