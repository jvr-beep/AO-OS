import { IsUUID } from "class-validator";

export class CreateFolioDto {
  @IsUUID()
  visit_id: string;
}
