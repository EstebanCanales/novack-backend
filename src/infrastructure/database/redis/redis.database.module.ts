import { Module } from "@nestjs/common";
import { RedisDatabaseService } from "./redis.database.service";
import { RedisDatabaseController } from "./redis.database.controller";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [RedisDatabaseService],
  controllers: [RedisDatabaseController],
  exports: [RedisDatabaseService],
})
export class RedisDatabaseModule {}
