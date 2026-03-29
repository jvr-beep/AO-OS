FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
COPY openapi ./openapi

RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter api build

EXPOSE 4000

CMD ["pnpm", "--filter", "api", "start"]
