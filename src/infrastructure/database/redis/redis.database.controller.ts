import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '@nestjs-modules/ioredis';

@Controller('redis')
export class RedisDatabaseController {
  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([async () => this.redis.isHealthy('redis')]);
  }
}
