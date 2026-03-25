import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateMemberPaymentDto } from "../dto/create-member-payment.dto";
import { ListMemberAccountEntriesQueryDto } from "../dto/list-member-account-entries.query.dto";
import { MemberAccountEntryResponseDto } from "../dto/member-account-entry.response.dto";
import { MemberAccountSummaryResponseDto } from "../dto/member-account-summary.response.dto";
import { MemberAccountService } from "../services/member-account.service";

@Controller("members/:id/account")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("operations", "admin")
export class MemberAccountController {
  constructor(private readonly memberAccountService: MemberAccountService) {}

  @Post("payments")
  createPayment(
    @Param("id") memberId: string,
    @Body() body: CreateMemberPaymentDto
  ): Promise<MemberAccountEntryResponseDto> {
    return this.memberAccountService.createPayment(memberId, body);
  }

  @Get()
  getAccount(@Param("id") memberId: string): Promise<MemberAccountSummaryResponseDto> {
    return this.memberAccountService.getAccount(memberId);
  }

  @Get("entries")
  listEntries(
    @Param("id") memberId: string,
    @Query() query: ListMemberAccountEntriesQueryDto
  ): Promise<MemberAccountEntryResponseDto[]> {
    return this.memberAccountService.listEntries(memberId, query);
  }
}