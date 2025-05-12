import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { LogTransportService } from './log-transport.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LogTransportService,
    StructuredLoggerService
  ],
  exports: [
    StructuredLoggerService,
    LogTransportService
  ],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar el middleware a todas las rutas
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
} 