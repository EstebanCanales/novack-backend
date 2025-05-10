/* @fileoverview Main application module that coordinates all feature modules and core configurations.
 * This module serves as the root module of the SP Cedes backend application.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { MailerModule } from '@nestjs-modules/mailer';
import { JwtModule } from '@nestjs/jwt';
import { PostgresqlDatabaseModule } from './infrastructure/database/postgres/postgresql.database.module';
import { SupplierModule } from './application/modules/supplier.module';
import { CardModule } from './application/modules/card.module';
import { EmployeeModule } from './application/modules/employee.module';
import { VisitorModule } from './application/modules/visitor.module';
import { SensorModule } from './application/modules/sensor.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityModule } from './application/modules/security.module';
import { EmailModule } from './application/modules/email.module';
import { AuthModule } from './application/modules/auth.module';
import { TwoFactorAuthModule } from './application/modules/two-factor-auth.module';
import { EmailVerificationModule } from './application/modules/email-verification.module';
import { RedisDatabaseModule } from './infrastructure/database/redis/redis.database.module';
import { CardSchedulerModule } from './application/modules/card-scheduler.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ESP32Module } from './application/modules/esp32.module';
// import { CompanyModule } from './application/modules/company.module';
// import { ServiceModule } from './application/modules/service.module';

/**
 * Root module of the application that configures and organizes all feature modules.
 * @module AppModule
 */
@Module({
  imports: [
    // Global configuration module for environment variables
    ConfigModule.forRoot({
      // envFilePath: ENV_FILE_PATH,
      envFilePath: '.env',
      isGlobal: true,
    }),
    // Rate limiting configuration to prevent abuse
    ThrottlerModule.forRoot([
      {
        ttl: 60, // Time window in seconds
        limit: 10, // Maximum number of requests within the time window
      },
    ]),
    // Programación de tareas
    ScheduleModule.forRoot(),
    
    // Database and infrastructure modules
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
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    RedisDatabaseModule,

    // Core business modules
    EmployeeModule, // Employee management and profiles
    CardModule, // Access card management
    VisitorModule, // Visitor registration and tracking
    SupplierModule, // Supplier management
    SensorModule, // IoT sensor data handling
    CardSchedulerModule, // Automated card assignment and tracking
    ESP32Module, // ESP32 devices communication
    // CompanyModule,
    // ServiceModule,

    // Security and authentication modules
    SecurityModule, // General security configurations
    AuthModule, // Authentication and authorization
    TwoFactorAuthModule, // Two-factor authentication

    // Communication modules
    EmailModule, // Email service integration
    EmailVerificationModule, // Email verification workflows

    // Additional modules
    /*
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MAIL_CONFIG,
    }),
    */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'supersecret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
