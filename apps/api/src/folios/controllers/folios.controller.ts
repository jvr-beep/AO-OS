import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AddFolioLineItemDto } from "../dto/add-folio-line-item.dto";
import { CreateFolioDto } from "../dto/create-folio.dto";
import { RecordPaymentDto } from "../dto/record-payment.dto";
import { FoliosService } from "../services/folios.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FoliosController {
  constructor(private readonly foliosService: FoliosService) {}

  @Post("folios")
  @Roles("front_desk", "operations", "admin")
  createFolio(@Body() dto: CreateFolioDto) {
    return this.foliosService.createFolio(dto);
  }

  @Get("folios/:folioId")
  @Roles("front_desk", "operations", "admin")
  getFolio(@Param("folioId", ParseUUIDPipe) folioId: string) {
    return this.foliosService.getFolio(folioId);
  }

  @Get("visits/:visitId/folio")
  @Roles("front_desk", "operations", "admin")
  getFolioByVisit(@Param("visitId", ParseUUIDPipe) visitId: string) {
    return this.foliosService.getFolioByVisit(visitId);
  }

  @Post("folios/:folioId/line-items")
  @Roles("front_desk", "operations", "admin")
  addLineItem(
    @Param("folioId", ParseUUIDPipe) folioId: string,
    @Body() dto: AddFolioLineItemDto
  ) {
    return this.foliosService.addLineItem(folioId, dto);
  }

  @Post("folios/:folioId/payments")
  @Roles("front_desk", "operations", "admin")
  recordPayment(
    @Param("folioId", ParseUUIDPipe) folioId: string,
    @Body() dto: RecordPaymentDto
  ) {
    return this.foliosService.recordPayment(folioId, dto);
  }
}
