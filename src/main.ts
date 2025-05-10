import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 4000;

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
      }),
    );

    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Authorization'],
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
