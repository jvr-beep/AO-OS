export class ProvisionStaffUserDto {
  email!: string;
  password!: string;
  givenName!: string;
  familyName!: string;
  role!: "admin" | "operations" | "front_desk";
  alias?: string;
}