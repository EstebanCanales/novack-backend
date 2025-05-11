import { Module, NestModule, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../../interface/controllers/auth.controller';
import { EmployeeModule } from './employee.module';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth, LoginAttempt, RefreshToken } from '../../domain/entities';
import { BruteForceMiddleware } from '../middlewares/brute-force.middleware';
import { TokenService } from '../services/token.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../guards/auth.guard';
import { CsrfModule } from './csrf.module';
import { CsrfMiddleware } from '../middlewares/csrf.middleware';
import { RedisDatabaseModule } from '../../infrastructure/database/redis/redis.database.module';

@Module({
  imports: [
    EmployeeModule,
    CsrfModule,
    forwardRef(() => RedisDatabaseModule),
    TypeOrmModule.forFeature([
      Employee, 
      EmployeeAuth, 
      LoginAttempt, 
      RefreshToken
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
          audience: configService.get<string>('JWT_AUDIENCE', 'https://api.spcedes.com'),
          issuer: configService.get<string>('JWT_ISSUER', 'SPCEDES_API'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    BruteForceMiddleware,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BruteForceMiddleware)
      .forRoutes(AuthController);
    
    // Aplicar protección CSRF a todas las rutas POST, PUT, DELETE, PATCH
    // exceptuando el login y refresh token que son rutas públicas
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'auth/login', method: 0 }, // 0 = POST
        { path: 'auth/refresh', method: 0 }
      )
      .forRoutes(AuthController);
  }
}

