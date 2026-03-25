export class CreateLockerDto {
  code!: string;
  locationId?: string;
  status?: "available" | "assigned" | "out_of_service";
}
