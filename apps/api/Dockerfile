FROM node:22-bookworm-slim

WORKDIR /app

# Enable pnpm from packageManager metadata in the repo.
RUN corepack enable

# Install OpenSSL for Prisma runtime compatibility.
RUN apt-get update -y && apt-get install -y openssl

# Copy workspace sources so pnpm can resolve monorepo packages and Prisma schema.
COPY . .

# Install dependencies and build API artifacts.
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate --schema ./prisma/schema.prisma
RUN pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 4000

# Run migrations then start the server.
# `prisma migrate deploy` is idempotent; concurrent identical runs are safe.
# This is a single-instance VM deployment — if a multi-instance setup is ever
# needed, move migrations to a one-shot init container or CI/CD pre-deploy step.
CMD ["sh", "-c", "pnpm prisma migrate deploy --schema ./prisma/schema.prisma && node apps/api/dist/main.js"]
