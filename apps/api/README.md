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

## Contributing

Please follow the existing code style and write tests for new features.

## License

UNLICENSED