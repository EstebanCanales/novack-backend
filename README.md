# Novack Backend

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/EstebanCanales/novack-backend)
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

## Módulo de Chat

El sistema incluye un módulo de chat en tiempo real con WebSockets que permite:

- Chats individuales entre empleados
- Chats entre empleados y visitantes
- Grupos de chat para todos los empleados de un mismo proveedor

### Características:

- Comunicación en tiempo real usando Socket.IO
- Persistencia de mensajes en base de datos
- Notificaciones de mensajes nuevos
- Historial de conversaciones
- Marcado de lectura de mensajes

### API REST para Chat:

- `GET /chat/rooms` - Obtener todas las salas de chat del usuario
- `GET /chat/rooms/:id/messages` - Obtener mensajes de una sala
- `POST /chat/rooms` - Crear una nueva sala de chat
- `POST /chat/messages` - Enviar un mensaje a una sala
- `POST /chat/rooms/supplier/:supplierId` - Crear sala de grupo para un proveedor
- `POST /chat/rooms/private` - Crear sala privada entre dos usuarios

### Eventos WebSocket:

- `registerUser` - Registrar usuario en el sistema de chat
- `joinRoom` - Unirse a una sala de chat
- `leaveRoom` - Salir de una sala de chat
- `sendMessage` - Enviar mensaje a una sala
- `createPrivateRoom` - Crear sala privada con otro usuario
- `getRoomMessages` - Obtener mensajes de una sala
- `getUserRooms` - Obtener salas del usuario

# Sistema de Logging Estructurado

## Características

El sistema de logging implementado ofrece las siguientes características:

- Logs estructurados en formato JSON
- Seguimiento de solicitudes con correlationId
- Niveles de log configurables (debug, info, warn, error)
- Integración con ELK Stack (Elasticsearch, Logstash, Kibana)
- Soporte para logs en archivos y en consola
- Contexto de ejecución para enriquecer los logs

## Variables de entorno

Configure las siguientes variables de entorno:

```
LOG_LEVEL=info               # debug, info, warn, error
LOG_TO_FILE=true             # true o false
ELK_ENABLED=true             # true o false
ELK_HOST=http://localhost:9200
APP_NAME=novack-backend
```

## Configuración de ELK Stack

Para iniciar el stack ELK:

```bash
# Dar permisos de ejecución
chmod +x scripts/setup-elk.sh

# Ejecutar script de configuración
./scripts/setup-elk.sh
```

El script configurará:

- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601
- Logstash escuchando en puerto 50000 y 5044

## Uso del Logger

```typescript
// Inyectar el logger
constructor(private logger: StructuredLoggerService) {
  this.logger.setContext('MiServicio');
}

// Métodos disponibles
this.logger.log('Mensaje informativo', null, { datos: 'adicionales' });
this.logger.debug('Mensaje de depuración', null, { datos: 'adicionales' });
this.logger.warn('Advertencia', null, { datos: 'adicionales' });
this.logger.error('Error', null, errorStack, { datos: 'adicionales' });
```

El correlationId se propaga automáticamente entre solicitudes HTTP.
