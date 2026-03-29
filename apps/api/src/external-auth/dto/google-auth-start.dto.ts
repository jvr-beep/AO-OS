export type GoogleAuthMode = "login" | "link" | "convert";

export class GoogleAuthStartDto {
  mode?: GoogleAuthMode;
  memberId?: string;
}
