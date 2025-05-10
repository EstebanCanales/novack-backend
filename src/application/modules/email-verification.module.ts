import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailVerificationController } from '../../interface/controllers/email-verification.controller';
import { EmailModule } from './email.module';
import { JwtConfigModule } from './jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeAuth]),
    EmailModule,
    JwtConfigModule,
  ],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}

