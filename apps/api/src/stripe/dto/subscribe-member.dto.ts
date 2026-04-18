import { IsString, IsNotEmpty } from "class-validator";

export class SubscribeMemberDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  planCode: string;

  /** Stripe Price ID for the selected plan (from Stripe dashboard) */
  @IsString()
  @IsNotEmpty()
  stripePriceId: string;
}
