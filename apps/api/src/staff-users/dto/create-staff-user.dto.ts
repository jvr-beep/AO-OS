export class CreateStaffUserDto {
  email!: string;
  password!: string;
  fullName!: string;
  role!: "admin" | "operations" | "front_desk";
}
