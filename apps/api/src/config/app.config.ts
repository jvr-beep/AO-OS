import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  logLevel: process.env.LOG_LEVEL || 'debug',
  name: process.env.APP_NAME || 'AO-OS API',
  description: process.env.APP_DESCRIPTION || 'API for AO-OS application',
}));