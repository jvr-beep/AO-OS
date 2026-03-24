import { SetMetadata } from "@nestjs/common";

export type StaffRole = "front_desk" | "operations" | "admin";

export const ROLES_KEY = "roles";
export const Roles = (...roles: StaffRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
