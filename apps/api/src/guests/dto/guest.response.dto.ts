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
  marketingOptIn!: boolean;
  createdAt!: string;
  updatedAt!: string;
  version!: number;
}
