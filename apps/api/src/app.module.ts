import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigModuleModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConfigModuleModule,
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}