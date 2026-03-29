import { GuestResponseDto } from "./guest.response.dto";

export class GuestLookupResponseDto {
  matchType!: "none" | "fuzzy" | "exact" | "multiple";
  guest!: GuestResponseDto | null;
  duplicateCandidates!: GuestResponseDto[];
}
