import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateWristbandTransactionDto } from "../dto/create-wristband-transaction.dto";
import { WristbandTransactionResponseDto } from "../dto/wristband-transaction.response.dto";
import { WristbandTransactionsService } from "../services/wristband-transactions.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WristbandTransactionsController {
  constructor(private readonly wristbandTransactionsService: WristbandTransactionsService) {}

  @Post("wristband-transactions")
  @Roles("operations", "admin")
  create(
    @Body() body: CreateWristbandTransactionDto
  ): Promise<WristbandTransactionResponseDto> {
    return this.wristbandTransactionsService.create(body);
  }

  @Get("wristband-transactions")
  @Roles("operations", "admin")
  list(): Promise<WristbandTransactionResponseDto[]> {
    return this.wristbandTransactionsService.list();
  }

  @Get("members/:id/wristband-transactions")
  @Roles("operations", "admin")
  listForMember(@Param("id") memberId: string): Promise<WristbandTransactionResponseDto[]> {
    return this.wristbandTransactionsService.listForMember(memberId);
  }
}
