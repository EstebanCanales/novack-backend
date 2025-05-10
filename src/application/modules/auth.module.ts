import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../../interface/controllers/auth.controller';
import { EmployeeModule } from './employee.module';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth, LoginAttempt } from '../../domain/entities';
import { BruteForceMiddleware } from '../middlewares/brute-force.middleware';

@Module({
  imports: [
    EmployeeModule,
    TypeOrmModule.forFeature([Employee, EmployeeAuth, LoginAttempt]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, BruteForceMiddleware],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BruteForceMiddleware)
      .forRoutes(AuthController);
  }
}

