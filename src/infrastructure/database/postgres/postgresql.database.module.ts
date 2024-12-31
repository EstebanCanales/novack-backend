import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgresqlDatabaseService } from './postgresql.database.service';
import { PostgresqlDatabaseController } from './postgresql.database.controller';
import { Card, Employee, Sensor, Supplier, Visitor } from 'src/domain/entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT')),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [Supplier, Card, Employee, Visitor, Sensor],
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
  ],
  providers: [PostgresqlDatabaseService],
  controllers: [PostgresqlDatabaseController],
  exports: [PostgresqlDatabaseService],
})
export class PostgresqlDatabaseModule {}
