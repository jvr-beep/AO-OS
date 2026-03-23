import * as Joi from 'joi';

export const envValidation = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string(),
  DATABASE_NAME: Joi.string().default('api_db'),
  DATABASE_LOGGING: Joi.boolean().default(false),
  JWT_SECRET: Joi.string(),
  JWT_EXPIRATION: Joi.number().default(3600),
  API_VERSION: Joi.string().default('v1'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
  APP_NAME: Joi.string().default('AO-OS API'),
  APP_DESCRIPTION: Joi.string().default('API for AO-OS application'),
});