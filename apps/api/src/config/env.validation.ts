import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_JWT_SECRET: z.string().min(16, "AUTH_JWT_SECRET must be at least 16 chars").optional(),
  MONITOR_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const INSECURE_DEFAULTS = new Set([
  "dev-only-secret-change-me",
  "replace-with-strong-random-secret",
]);

export function validateEnv(config: Record<string, unknown>): Env {
  const env = envSchema.parse(config);

  if (env.NODE_ENV === "production") {
    if (!env.AUTH_JWT_SECRET || INSECURE_DEFAULTS.has(env.AUTH_JWT_SECRET)) {
      throw new Error("AUTH_JWT_SECRET must be set to a strong secret in production");
    }
    if (!env.MONITOR_API_KEY) {
      console.warn("[WARN] MONITOR_API_KEY is not set — ops monitor endpoint is unprotected");
    }
  }

  return env;
}
