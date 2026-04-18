import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { StaffAuditService } from "../../staff-audit/services/staff-audit.service";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberLegalIdentityDto, MemberResponseDto } from "../dto/member.response.dto";
import { MembersService } from "../services/members.service";

@Controller("members")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly staffAudit: StaffAuditService,
  ) {}

  @Get()
  @Roles("front_desk", "operations", "admin")
  listMembers(@Query("q") q?: string): Promise<MemberResponseDto[]> {
    return this.membersService.listMembers(q);
  }

  @Post()
  @Roles("front_desk", "operations", "admin")
  createMember(@Body() body: CreateMemberDto): Promise<MemberResponseDto> {
    return this.membersService.createMember(body);
  }

  @Get(":id")
  @Roles("front_desk", "operations", "admin")
  getMemberById(@Param("id") id: string): Promise<MemberResponseDto> {
    return this.membersService.getMemberById(id);
  }

  /**
   * Restricted endpoint — returns legal first/last name.
   * Admin only. Every access is audit logged.
   * Valid use: waivers, payments, fraud review, identity verification.
   */
  @Get(":id/legal-identity")
  @Roles("admin")
  async getMemberLegalIdentity(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<MemberLegalIdentityDto> {
    const actor = (req as any).user;
    const result = await this.membersService.getMemberLegalIdentity(id);

    await this.staffAudit.write({
      eventType: "member.legal_identity_accessed",
      actor: { id: actor?.sub, email: actor?.email ?? "", role: actor?.role ?? "" },
      outcome: "success",
      metadataJson: { memberId: id, publicMemberNumber: result.publicMemberNumber },
    });

    return result;
  }
}
