import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 4000;
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

    const config = new DocumentBuilder()
      .setTitle('SP-CEDES API')
      .setDescription(
        `API para la gestión de tarjetas y visitantes de SP-CEDES.`,
      )
      .setVersion('0.1')
      .addTag(
        'suppliers',
        'Operaciones relacionadas con proveedores y sus suscripciones',
      )
      .addTag(
        'cards',
        'Operaciones relacionadas con tarjetas de acceso y su asignación',
      )
      .addTag(
        'visitors',
        'Operaciones relacionadas con visitantes y su gestión',
      )
      .addTag('Sensor', 'Comming soon...')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

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

    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api`,
    );
  } catch (error) {
    logger.error('❌ Error starting application:', error.message);
    process.exit(1);
  }
}

bootstrap();
