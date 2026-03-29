import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { ConvertMemberDto } from "../dto/convert-member.dto";
import { CreateAnonymousMemberDto } from "../dto/create-anonymous-member.dto";
import { CreateRegisteredMemberDto } from "../dto/create-registered-member.dto";
import { MemberIdentityResponseDto } from "../dto/member-identity.response.dto";
import { IdentityService } from "../services/identity.service";

@Controller("identity/members")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /** Front-desk: create walk-in anonymous member (no auth required in dev, guard in prod) */
  @Post("anonymous")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createAnonymous(@Body() body: CreateAnonymousMemberDto): Promise<MemberIdentityResponseDto> {
    return this.identityService.createAnonymous(body);
  }

  /** Admin/staff: create registered member (sends invite email) */
  @Post("registered")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createRegistered(
    @Body() body: CreateRegisteredMemberDto,
    @Req() req: any
  ): Promise<MemberIdentityResponseDto> {
    return this.identityService.createRegistered(body, req.user.sub);
  }

  /** Convert anonymous member to registered */
  @Post(":memberId/convert")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  convert(
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() body: ConvertMemberDto
  ): Promise<MemberIdentityResponseDto> {
    return this.identityService.convertToRegistered(memberId, body);
  }
}

@Controller("admin/members")
export class AdminMembersController {
  constructor(private readonly identityService: IdentityService) {}

  /** Admin only: trigger password reset for member */
  @Post(":memberId/password-reset")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "operations")
  triggerPasswordReset(
    @Param("memberId", ParseUUIDPipe) memberId: string
  ): Promise<{ email: string; resetLink: string }> {
    return this.identityService.adminResetPassword(memberId);
  }
}
