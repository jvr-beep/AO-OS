FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl

# Copy manifests before source so dependency install is a cached layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate --schema ./prisma/schema.prisma
RUN pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
