import { Controller, Get } from '@nestjs/common';
import { RedisDatabaseService } from './redis.database.service';

@Controller('redis')
export class RedisDatabaseController {
  constructor(private readonly databaseService: RedisDatabaseService) {}

  @Get('healt')
  testConnection() {
    return this.databaseService.testConnection();
  }
}
