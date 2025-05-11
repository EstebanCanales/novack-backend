import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailVerificationController } from '../../interface/controllers/email-verification.controller';
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
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}

