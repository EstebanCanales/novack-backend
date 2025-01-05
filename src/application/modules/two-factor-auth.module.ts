import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../domain/entities';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { TwoFactorAuthController } from '../../interface/controllers/two-factor-auth.controller';
import { EmailModule } from './email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    EmailModule,
  ],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {} 