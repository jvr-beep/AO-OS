import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { envValidation } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      validationSchema: envValidation,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModuleModule {}