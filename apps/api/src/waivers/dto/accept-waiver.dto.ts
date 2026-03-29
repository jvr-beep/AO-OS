export class AcceptWaiverDto {
  waiverVersion!: string;
  acceptedChannel!: "web" | "kiosk" | "staff";
  signatureText?: string;
}
