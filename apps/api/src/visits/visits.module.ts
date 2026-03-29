import { Module } from '@nestjs/common';
import { VisitsController } from './controllers/visits.controller';
import { VisitsService } from './services/visits.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
