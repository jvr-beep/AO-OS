export interface MemberIdentityResponseDto {
  id: string;
  publicMemberNumber: string;
  type: string;
  email: string | null;
  emailVerifiedAt: string | null;
  alias: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  wristband?: {
    id: string;
    uid: string;
    status: string;
  };
}
