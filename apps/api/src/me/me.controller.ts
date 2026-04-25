import { Controller, Get, Patch, Body, Req, UseGuards, HttpCode } from "@nestjs/common";
import { MeService } from "./me.service";
import { MemberSessionGuard } from "../auth/guards/member-session.guard";
import { IsOptional, IsString, IsBoolean } from "class-validator";

class UpdateProfileDto {
  @IsOptional() @IsString() preferredName?: string;
  @IsOptional() @IsString() pronouns?: string;
  @IsOptional() @IsBoolean() marketingOptInEmail?: boolean;
}

/**
 * Member self-service API — all routes require X-AO-Member-Session header.
 *
 * GET  /v1/me              — profile + active subscription summary
 * GET  /v1/me/visit        — active visit (if any)
 * GET  /v1/me/visits       — visit history
 * GET  /v1/me/subscription — full subscription details
 * GET  /v1/me/wristband    — active wristband assignment
 * GET  /v1/me/transactions — wristband transaction history
 * PATCH /v1/me/profile     — update profile preferences
 */
@Controller("me")
@UseGuards(MemberSessionGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getProfile(@Req() req: any) {
    return this.meService.getProfile(req.memberId);
  }

  @Get("visit")
  getActiveVisit(@Req() req: any) {
    return this.meService.getActiveVisit(req.memberId);
  }

  @Get("visits")
  getVisitHistory(@Req() req: any) {
    return this.meService.getVisitHistory(req.memberId);
  }

  @Get("subscription")
  getSubscription(@Req() req: any) {
    return this.meService.getSubscription(req.memberId);
  }

  @Get("wristband")
  getWristband(@Req() req: any) {
    return this.meService.getWristband(req.memberId);
  }

  @Get("transactions")
  getTransactions(@Req() req: any) {
    return this.meService.getTransactions(req.memberId);
  }

  @Patch("profile")
  @HttpCode(200)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.meService.updateProfile(req.memberId, dto);
  }
}
