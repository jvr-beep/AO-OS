// Keep AUTH_JWT_SECRET initialization in Jest setupFiles so it runs before AppModule import.
// This ensures JwtModule signing and JwtStrategy validation use the same secret in integration tests.
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "integration-test-secret";
process.env.AUTH_JWT_EXPIRES_IN = process.env.AUTH_JWT_EXPIRES_IN ?? "1h";
