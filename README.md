# Novack Backend

## Description
Backend service for Novack project built with NestJS. This system provides a robust API for managing access control, employee management, visitor tracking, and security monitoring in corporate environments.

### Key Features
- 🔐 Authentication and Authorization System
- 👥 Employee Management
- 🎫 Access Card Control
- 📱 Two-Factor Authentication
- 🏢 Visitor Management
- 🔍 Security Monitoring
- 📊 Sensor Data Management
- 📧 Email Notifications and Verification
- 🛡️ Rate Limiting Protection
- 🏭 Supplier Management

### Architecture
The application follows Clean Architecture principles with a modular design:

- **Application Layer**: Controllers, DTOs, and Services
- **Domain Layer**: Business entities and core logic
- **Infrastructure Layer**: Database connections and external services
- **Interface Layer**: REST API endpoints and controllers

### Technologies
- NestJS Framework
- PostgreSQL Database
- Redis for Caching
- JWT Authentication
- TypeORM
- Docker Containerization

## Prerequisites
- Docker
- Docker Compose
- Node.js (for local development)
- pnpm (for local development)

## Installation

### Using Docker (Recommended)
1. Clone the repository
```bash
git clone [your-repository-url]
cd spcedes-backend
```

2. Copy the environment file
```bash
cp .env.example .env
```

3. Update the environment variables in `.env` if needed

4. Start the application using Docker Compose
```bash
docker-compose up --build
```

The application will be available at:
- API: http://localhost:4000
- PostgreSQL: localhost:5434
- Redis: localhost:6379

### Local Development
1. Install dependencies
```bash
pnpm install
```

2. Copy and configure environment variables
```bash
cp .env.example .env
```

3. Start the application
```bash
pnpm run start:dev
```

## Testing
```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Docker Configuration
The project includes:
- `Dockerfile` for building the application container
- `docker-compose.yml` for orchestrating all services (API, PostgreSQL, Redis)
- Persistent volumes for database and cache data
- Automatic database connection handling

## Environment Variables
Check `.env.example` for all required environment variables.

