export class CreateHoldDto {
  visit_id!: string;
  product_type!: "locker" | "room";
  tier_id!: string;
  duration_minutes!: number;
  hold_scope!: "resource" | "tier_pool";
}
