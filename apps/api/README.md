# API Service

This is the API service for the AO-OS project. It's built with NestJS and provides RESTful endpoints for the application.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Update the environment variables in `.env` as needed.

### Running the Application

**Development mode:**

```bash
npm run start:dev
```

**Production mode:**

```bash
npm run build
npm run start:prod
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── main.ts           # Application entry point
├── app.controller.ts # Main controller
├── app.service.ts    # Main service
└── ...               # Additional modules and services
```

## API Documentation

Once the server is running, you can access the API at:
- Local: `http://localhost:3001`
- API Documentation: `http://localhost:3001/api` (if Swagger is configured)

## Vercel Deployment

The `vercel.json` in this directory configures serverless deployment.

**Required Vercel environment variables** (Settings → Environment Variables):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_JWT_SECRET` | Random secret for JWT signing |
| `CORS_ORIGIN` | Comma-separated allowed origins (e.g. `https://app.aosanctuary.com`) |
| `APP_BASE_URL` | Public base URL of the web app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google OAuth credentials |
| `RESEND_API_KEY` | Resend email API key (or set Gmail vars) |

> **Monorepo note:** `buildCommand` in `vercel.json` uses the path `../../prisma/schema.prisma`
> relative to this directory (`apps/api`). The Vercel project's **Root Directory** must be set to
> `apps/api` for this path to resolve correctly.

## Contributing

Please follow the existing code style and write tests for new features.

## License

UNLICENSED