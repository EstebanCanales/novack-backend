import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { 
  Supplier, 
  SupplierSubscription, 
  Employee, 
  EmployeeAuth, 
  Visitor, 
  Appointment, 
  Card, 
  CardLocation, 
  Sensor, 
  SensorReading 
} from '../../../domain/entities';
import { PostgresqlDatabaseService } from './postgresql.database.service';
import { PostgresqlDatabaseController } from './postgresql.database.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'postgres'),
        entities: [
          Supplier, 
          SupplierSubscription, 
          Employee, 
          EmployeeAuth, 
          Visitor, 
          Appointment, 
          Card, 
          CardLocation, 
          Sensor, 
          SensorReading
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
  ],
  controllers: [PostgresqlDatabaseController],
  providers: [PostgresqlDatabaseService],
  exports: [PostgresqlDatabaseService],
})
export class PostgresqlDatabaseModule {}
