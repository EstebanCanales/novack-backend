import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from '../guards/throttler.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class SecurityModule {}

