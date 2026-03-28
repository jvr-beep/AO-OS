import { z } from "zod";

export const envSchema = z.object({
  // Core runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().min(1).default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth / JWT
  AUTH_JWT_SECRET: z.string().min(1, "AUTH_JWT_SECRET is required"),
  AUTH_JWT_EXPIRES_IN: z.string().default("1h"),

  // Google OAuth (optional — required when Google login is enabled)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Email / transactional (optional — required when email features are enabled)
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Bootstrap / seed admin (optional)
  AUTH_SEED_ADMIN_EMAIL: z.string().email().optional(),
  AUTH_SEED_ADMIN_PASSWORD: z.string().optional(),
  AUTH_SEED_ADMIN_NAME: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
