import { CheckOutChannel } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CheckoutDto {
  @IsUUID()
  visit_id: string;

  @IsEnum(CheckOutChannel)
  check_out_channel: CheckOutChannel;

  @IsString()
  @IsOptional()
  changed_by_user_id?: string;
}
