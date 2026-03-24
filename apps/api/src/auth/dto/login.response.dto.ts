import { StaffRole } from "../decorators/roles.decorator";

export class LoginResponseDto {
  accessToken!: string;
  staffUser!: {
    id: string;
    email: string;
    fullName: string;
    role: StaffRole;
  };
}
