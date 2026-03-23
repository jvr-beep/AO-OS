import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberResponseDto } from "../dto/member.response.dto";
import { MembersService } from "../services/members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  createMember(@Body() body: CreateMemberDto): Promise<MemberResponseDto> {
    return this.membersService.createMember(body);
  }

  @Get(":id")
  getMemberById(@Param("id") id: string): Promise<MemberResponseDto> {
    return this.membersService.getMemberById(id);
  }
}