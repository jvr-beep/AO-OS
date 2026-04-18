FROM node:22-bookworm-slim

WORKDIR /app

# Enable pnpm from packageManager metadata in the repo.
RUN corepack enable

# Copy workspace sources so pnpm can resolve monorepo packages.
COPY . .

# Install dependencies.
RUN pnpm install --frozen-lockfile

# Build-time secrets (Next.js bakes NEXT_PUBLIC_* vars into the bundle at build time).
ARG SESSION_SECRET
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ENV SESSION_SECRET=$SESSION_SECRET
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN pnpm --filter @ao-os/web build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@ao-os/web", "start"]
