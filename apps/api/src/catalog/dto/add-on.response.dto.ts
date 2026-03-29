export class AddOnResponseDto {
  code!: string;
  name!: string;
  priceCents!: number;
  quantityLimit?: number | null;
  productType?: "locker" | "room" | "both";
}
