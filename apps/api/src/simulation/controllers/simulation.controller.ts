import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { Roles } from '../../auth/decorators/roles.decorator'
import { SimulationService } from '../services/simulation.service'
import { FireReaderDto } from '../dto/fire-reader.dto'
import { SimulationCheckInDto, SimulationCheckOutDto } from '../dto/simulation-check-in.dto'

@Controller('simulation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SimulationController {
  constructor(private readonly simulation: SimulationService) {}

  @Get('locations')
  @Roles('front_desk', 'operations', 'admin')
  listSandboxLocations() {
    return this.simulation.listSandboxLocations()
  }

  @Get('locations/:locationId/access-points')
  @Roles('front_desk', 'operations', 'admin')
  listAccessPoints(@Param('locationId') locationId: string) {
    return this.simulation.listAccessPoints(locationId)
  }

  @Get('locations/:locationId/sessions')
  @Roles('front_desk', 'operations', 'admin')
  listActiveSessions(@Param('locationId') locationId: string) {
    return this.simulation.listActiveSessions(locationId)
  }

  @Post('fire-reader')
  @Roles('front_desk', 'operations', 'admin')
  fireReader(@Body() dto: FireReaderDto) {
    return this.simulation.fireReader(dto)
  }

  @Post('check-in')
  @Roles('front_desk', 'operations', 'admin')
  checkIn(@Body() dto: SimulationCheckInDto) {
    return this.simulation.simulateCheckIn(dto)
  }

  @Post('check-out')
  @Roles('front_desk', 'operations', 'admin')
  checkOut(@Body() dto: SimulationCheckOutDto) {
    return this.simulation.simulateCheckOut(dto)
  }
}
