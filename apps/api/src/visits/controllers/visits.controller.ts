import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VisitsService } from '../services/visits.service';
import { CreateVisitDto } from '../dto/create-visit.dto';
import { TransitionVisitStatusDto } from '../dto/transition-visit-status.dto';
import { ListVisitsQueryDto } from '../dto/list-visits.query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get('visits')
  @Roles('front_desk', 'operations', 'admin')
  listVisits(@Query() query: ListVisitsQueryDto) {
    return this.visitsService.listVisits(query);
  }

  @Post('visits')
  @Roles('front_desk', 'operations', 'admin')
  initiateVisit(@Body() dto: CreateVisitDto) {
    return this.visitsService.initiateVisit(dto);
  }

  @Get('visits/:visitId')
  @Roles('front_desk', 'operations', 'admin')
  getVisit(@Param('visitId', ParseUUIDPipe) visitId: string) {
    return this.visitsService.getVisit(visitId);
  }

  @Get('visits/:visitId/status-history')
  @Roles('front_desk', 'operations', 'admin')
  getVisitStatusHistory(@Param('visitId', ParseUUIDPipe) visitId: string) {
    return this.visitsService.getVisitStatusHistory(visitId);
  }

  @Get('guests/:guestId/visits')
  @Roles('front_desk', 'operations', 'admin')
  listGuestVisits(
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Query() query: ListVisitsQueryDto,
  ) {
    return this.visitsService.listGuestVisits(guestId, query);
  }

  @Patch('visits/:visitId/status')
  @Roles('front_desk', 'operations', 'admin')
  transitionVisitStatus(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: TransitionVisitStatusDto,
  ) {
    return this.visitsService.transitionVisitStatus(visitId, dto);
  }
}
