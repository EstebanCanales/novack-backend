import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RedisDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(RedisDatabaseService.name);

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
    } catch (error) {
      throw error;
    }
  }

  async testConnection() {
    try {
    } catch (error) {
      throw error;
    }
  }
}
