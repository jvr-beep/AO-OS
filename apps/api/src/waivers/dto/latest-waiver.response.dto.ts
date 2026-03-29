import { WaiverAcceptanceResponseDto } from "./waiver-acceptance.response.dto";

export class LatestWaiverResponseDto {
  isValid!: boolean;
  latest!: WaiverAcceptanceResponseDto | null;
  currentWaiverVersion!: string;
}
