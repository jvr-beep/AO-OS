import { IsIn } from "class-validator";

export class VoiceRitualDto {
  @IsIn(["restore", "release", "retreat"])
  mode: "restore" | "release" | "retreat";

  @IsIn(["opening", "mid", "deep", "closing"])
  phase: "opening" | "mid" | "deep" | "closing";
}
