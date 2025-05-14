import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';

async function bootstrap() {
  // const startupCorrelationId = uuidv4();
  
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = await app.resolve(StructuredLoggerService);
  
  app.useLogger(logger);
  app.flushLogs();
  
  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT', '3000');
  
  logger.log(`Aplicación iniciando en puerto ${port}`, 'Bootstrap', {
    port,
    nodeEnv: process.env.NODE_ENV
  });
  
  const isProduction = process.env.NODE_ENV === 'production';

  // Configurar cookie parser para manejar cookies
  app.use(cookieParser(process.env.COOKIE_SECRET || 'secret_cookie_for_dev_only'));

  // Configurar sesiones
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'session_secret_for_dev_only',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // No accesible por JavaScript
        secure: isProduction, // Solo https en producción
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        sameSite: isProduction ? 'strict' : 'lax',
      },
    }),
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-TOKEN', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Authorization', 'XSRF-TOKEN'],
    credentials: true,
    maxAge: 3600,
  });

  await app.listen(parseInt(port));
  
  logger.log(`Aplicación iniciada correctamente en puerto ${port}`, 'Bootstrap', {
    startupTime: new Date().toISOString(),
    swaggerUrl: !isProduction ? `http://localhost:${port}/api` : undefined
  });
}

bootstrap().catch(err => {
  console.error('Error durante el inicio de la aplicación:', err);
  process.exit(1);
});
