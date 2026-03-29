import { AccessResult } from "@prisma/client";
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class LogGuestAccessEventDto {
  @IsString()
  @IsOptional()
  wristband_id?: string;

  @IsUUID()
  @IsOptional()
  visit_id?: string;

  @IsString()
  reader_id: string;

  @IsString()
  zone_code: string;

  @IsEnum(AccessResult)
  access_result: AccessResult;

  @IsString()
  @IsOptional()
  denial_reason?: string;

  @IsISO8601()
  event_time: string;
}
