import { IsISO8601, IsOptional, IsString, MinLength } from "class-validator";

export class ScanWristbandDto {
  @IsString()
  @MinLength(1)
  wristbandUid!: string;

  @IsString()
  @MinLength(1)
  accessPointCode!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  attemptSource?: string;
}
