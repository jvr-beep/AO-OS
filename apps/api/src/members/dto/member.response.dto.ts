export class MemberResponseDto {
  id!: string;
  publicMemberNumber!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  displayName?: string | null;
  phone?: string | null;
  status!: string;
  createdAt!: string;
}