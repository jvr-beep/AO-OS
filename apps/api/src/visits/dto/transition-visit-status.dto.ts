import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { GuestVisitStatus, FolioPaymentStatus } from '@prisma/client';

export class TransitionVisitStatusDto {
  @IsEnum(GuestVisitStatus)
  status: GuestVisitStatus;

  @IsString()
  @IsOptional()
  reason_code?: string;

  @IsString()
  @IsOptional()
  reason_text?: string;

  @IsString()
  @IsOptional()
  changed_by_user_id?: string;

  @IsBoolean()
  @IsOptional()
  waiver_completed?: boolean;

  @IsEnum(FolioPaymentStatus)
  @IsOptional()
  payment_status?: FolioPaymentStatus;
}
