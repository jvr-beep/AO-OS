FROM node:22-bookworm-slim

WORKDIR /app

# Enable pnpm from packageManager metadata in the repo.
RUN corepack enable

# Copy workspace sources so pnpm can resolve monorepo packages.
COPY . .

# Install dependencies and build Next.js app.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ao-os/web build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@ao-os/web", "start"]
