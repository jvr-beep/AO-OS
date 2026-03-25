export class LockerResponseDto {
  id!: string;
  code!: string;
  locationId?: string;
  status!: "available" | "assigned" | "out_of_service";
  createdAt!: string;
  updatedAt!: string;
}
