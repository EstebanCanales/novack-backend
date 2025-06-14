import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe.service'; // Corrected path
import { SupplierModule } from '../supplier.module'; // Corrected path
import { LoggingModule } from '../../../infrastructure/logging/logging.module'; // Corrected path
import { StripeController } from '../../interface/controllers/stripe.controller'; // Added import

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SupplierModule), // If SupplierService is injected into StripeService
    LoggingModule, // Assuming StructuredLoggerService is provided here
  ],
  controllers: [StripeController], // Added StripeController
  providers: [
    StripeService, // Add StripeService
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
          throw new Error('Stripe secret key is not defined in environment variables');
        }
        return new Stripe(secretKey, {
          apiVersion: '2023-10-16',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    StripeService, // Export StripeService
    'STRIPE_CLIENT',
  ],
})
export class StripeModule {}
