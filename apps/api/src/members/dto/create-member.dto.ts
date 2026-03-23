export class CreateMemberDto {
  email!: string;
  firstName!: string;
  lastName!: string;
  displayName?: string;
  phone?: string;
}