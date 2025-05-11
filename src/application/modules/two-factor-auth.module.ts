import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { TwoFactorAuthController } from '../../interface/controllers/two-factor-auth.controller';
import { EmailModule } from './email.module';
import { JwtConfigModule } from './jwt.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeAuth]),
    EmailModule,
    JwtConfigModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

