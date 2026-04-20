FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy manifests before source so dependency install is a cached layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY . .

# SESSION_SECRET must be set at build time to satisfy Next.js import-time validation.
# The actual runtime value comes from apps/web/.env — this placeholder is never
# served to clients (server-side env vars are not baked into the bundle).
ARG SESSION_SECRET=build-time-placeholder-for-ci-not-used-in-prod
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ENV SESSION_SECRET=$SESSION_SECRET
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN pnpm --filter @ao-os/web build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@ao-os/web", "start"]
