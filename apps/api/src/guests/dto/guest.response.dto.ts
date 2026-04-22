export class GuestResponseDto {
  id!: string;
  firstName!: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  preferredLanguage!: string;
  membershipStatus!: string;
  riskFlagStatus!: string;
  riskFlagReason?: string | null;
  riskFlaggedAt?: string | null;
  riskFlaggedBy?: string | null;
  marketingOptIn!: boolean;
  preferences?: Record<string, unknown> | null;
  createdAt!: string;
  updatedAt!: string;
  version!: number;
}
