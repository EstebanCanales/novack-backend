import { Module } from "@nestjs/common";
import { AppController } from "./interface/controllers/app.controller";
import { AppService } from "./application/services/app.service";
import { AppConfigModule } from "./infrastructure/config/app.config.module";

@Module({
  imports: [AppConfigModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
