import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberResponseDto } from "../dto/member.response.dto";
import { MembersService } from "../services/members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listMembers(@Query("q") q?: string): Promise<MemberResponseDto[]> {
    return this.membersService.listMembers(q);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createMember(@Body() body: CreateMemberDto): Promise<MemberResponseDto> {
    return this.membersService.createMember(body);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  getMemberById(@Param("id") id: string): Promise<MemberResponseDto> {
    return this.membersService.getMemberById(id);
  }
}