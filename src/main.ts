import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, HttpStatus } from '@nestjs/common'; // HttpStatus might be used by the filter
import { ConfigService } from '@nestjs/config';
// import { v4 as uuidv4 } from 'uuid'; // No longer directly used here for startupCorrelationId
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';
import { GlobalExceptionFilter } from './infrastructure/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until a logger is attached
  });

  // Use the app's StructuredLoggerService for consistency, or resolve if needed for main bootstrap logs.
  // For the GlobalExceptionFilter, we need an instance of StructuredLoggerService.
  // Since LoggingModule is Global, StructuredLoggerService should be available.
  const structuredLoggerService = app.get(StructuredLoggerService);

  // app.useLogger(Logger); // Using NestJS's default Logger token, which should be our StructuredLoggerService
  // It's better to pass the specific instance if we have it, especially for app-level logging.
  app.useLogger(structuredLoggerService);
  app.flushLogs(); // Flush buffered logs using the newly set logger

  // Register the GlobalExceptionFilter
  // const structuredLoggerService = app.get(StructuredLoggerService); // Already got above
  app.useGlobalFilters(new GlobalExceptionFilter(structuredLoggerService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000); // Use config service for port

  // Use the structuredLoggerService for bootstrap logging
  structuredLoggerService.log(`Aplicación iniciando en puerto ${port}`, 'Bootstrap', {
    port,
    nodeEnv: process.env.NODE_ENV,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Configurar cookie parser para manejar cookies
  app.use(
    cookieParser(process.env.COOKIE_SECRET || 'secret_cookie_for_dev_only'),
  );

  // Aplicar helmet para seguridad de cabeceras HTTP
  app.use(helmet());

  // Configurar CSP para prevenir XSS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Novack API')
      .setDescription('API REST para la aplicación de Novack')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-CSRF-TOKEN',
      'X-XSRF-TOKEN',
    ],
    exposedHeaders: ['Authorization', 'XSRF-TOKEN'],
    credentials: true,
    maxAge: 3600,
  });

  await app.listen(port);

  structuredLoggerService.log(
    `Aplicación iniciada correctamente en puerto ${port}`,
    'Bootstrap',
    {
      startupTime: new Date().toISOString(),
      // Ensure swaggerUrl is correctly formed if port comes from config
      swaggerUrl: !isProduction ? `http://localhost:${port}/api` : undefined,
    },
  );
}

bootstrap().catch((err) => {
  // Use console.error for bootstrap errors as logger might not be fully initialized
  // or if the error happens before logger setup.
  console.error('Error crítico durante el inicio de la aplicación:', err);
  process.exit(1);
});
