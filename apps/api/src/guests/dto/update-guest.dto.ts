import { GuestRiskFlagStatus } from '@prisma/client';

export class UpdateGuestDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  preferredLanguage?: string;
  marketingOptIn?: boolean;
  riskFlagStatus?: GuestRiskFlagStatus;
  riskFlagReason?: string | null;
}
