import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgresqlDatabaseModule } from './infrastructure/database/postgres/postgresql.database.module';
import { RedisDatabaseModule } from './infrastructure/database/redis/redis.database.module';
import { SupplierModule } from './application/modules/supplier.module';
import { CardModule } from './application/modules/card.module';
import { EmployeeModule } from './application/modules/employee.module';
import { VisitorModule } from './application/modules/visitor.module';
import { SensorModule } from './application/modules/sensor.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityModule } from './common/modules/security.module';
import { EmailModule } from './application/modules/email.module';
import { AuthModule } from './application/modules/auth.module';
import { TwoFactorAuthModule } from './application/modules/two-factor-auth.module';
import { EmailVerificationModule } from './application/modules/email-verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
    PostgresqlDatabaseModule,
    RedisDatabaseModule,
    SupplierModule,
    CardModule,
    EmployeeModule,
    VisitorModule,
    SensorModule,
    SecurityModule,
    EmailModule,
    AuthModule,
    TwoFactorAuthModule,
    EmailVerificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
