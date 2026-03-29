export class MemberResponseDto {
  id!: string;
  publicMemberNumber!: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  status!: string;
  createdAt!: string;
}
