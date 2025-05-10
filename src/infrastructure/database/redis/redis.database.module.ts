import { Module } from "@nestjs/common";
import { RedisDatabaseService } from "./redis.database.service";
import { RedisDatabaseController } from "./redis.database.controller";

@Module({
  providers: [RedisDatabaseService],
  controllers: [RedisDatabaseController],
  exports: [RedisDatabaseService],
})
export class RedisDatabaseModule {}
