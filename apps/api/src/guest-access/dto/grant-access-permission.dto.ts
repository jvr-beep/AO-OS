import { Type } from "class-transformer";
import { IsISO8601, IsString, IsUUID } from "class-validator";

export class GrantAccessPermissionDto {
  @IsString()
  wristband_id: string;

  @IsUUID()
  visit_id: string;

  @IsString()
  zone_code: string;

  @IsISO8601()
  valid_from: string;

  @IsISO8601()
  valid_until: string;
}
