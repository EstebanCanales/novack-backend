import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthModule } from '@nestjs-modules/ioredis';
import { RedisDatabaseController } from './redis.database.controller';

@Module({
  imports: [TerminusModule, RedisHealthModule],
  controllers: [RedisDatabaseController],
})
export class RedisDatabaseModule {}
