export class MemberResponseDto {
  id!: string;
  publicMemberNumber!: string;
  email?: string | null;
  /** Safe display name for all staff-facing operational surfaces. Never legal name. */
  staffSafeDisplayName!: string;
  /** Raw alias set by member — null if not set. */
  alias?: string | null;
  phone?: string | null;
  status!: string;
  createdAt!: string;
}

/** Legal identity — restricted to admin role, every access is audit logged. */
export class MemberLegalIdentityDto {
  id!: string;
  publicMemberNumber!: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}
