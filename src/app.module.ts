import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgresqlDatabaseModule } from './infrastructure/database/postgres/postgresql.database.module';
import { RedisDatabaseModule } from './infrastructure/database/redis/redis.database.module';
import { SupplierModule } from './application/modules/supplier.module';
import { CardModule } from './application/modules/card.module';
import { EmployeeModule } from './application/modules/employee.module';
import { VisitorModule } from './application/modules/visitor.module';
import { SensorModule } from './application/modules/sensor.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityModule } from './common/modules/security.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
