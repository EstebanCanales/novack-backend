import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { TwoFactorAuthController } from '../../interface/controllers/two-factor-auth.controller';
import { EmailModule } from './email.module';
import { JwtConfigModule } from './jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeAuth]),
    EmailModule,
    JwtConfigModule,
  ],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

