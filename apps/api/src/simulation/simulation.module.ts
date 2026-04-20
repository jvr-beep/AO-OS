import { Module } from '@nestjs/common'
import { AccessControlModule } from '../access-control/access-control.module'
import { SimulationController } from './controllers/simulation.controller'
import { SimulationService } from './services/simulation.service'

@Module({
  imports: [AccessControlModule],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}
