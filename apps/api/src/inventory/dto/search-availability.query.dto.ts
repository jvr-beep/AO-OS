export class SearchAvailabilityQueryDto {
  product_type!: "locker" | "room";
  tier_id?: string;
  duration_minutes?: number;
}
