/* @fileoverview Main application module that coordinates all feature modules and core configurations.
 * This module serves as the root module of the SP Cedes backend application.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

/**
 * Root module of the application that configures and organizes all feature modules.
 * @module AppModule
 */
@Module({
  imports: [
    // Global configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting configuration to prevent abuse
    ThrottlerModule.forRoot([
      {
        ttl: 60, // Time window in seconds
        limit: 10, // Maximum number of requests within the time window
      },
    ]),
    // Database and infrastructure modules
    PostgresqlDatabaseModule,

    // Core business modules
    EmployeeModule, // Employee management and profiles
    CardModule, // Access card management
    VisitorModule, // Visitor registration and tracking
    SupplierModule, // Supplier management
    SensorModule, // IoT sensor data handling

    // Security and authentication modules
    SecurityModule, // General security configurations
    AuthModule, // Authentication and authorization
    TwoFactorAuthModule, // Two-factor authentication

    // Communication modules
    EmailModule, // Email service integration
    EmailVerificationModule, // Email verification workflows
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
