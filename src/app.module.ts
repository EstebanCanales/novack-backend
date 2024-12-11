import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PostgresqlDatabaseModule } from "./infrastructure/database/postgres/postgresql.database.module";
import { RedisDatabaseModule } from "./infrastructure/database/redis/redis.database.module";
import { UserModule } from "./application/modules/user.module";
import { SupplierModule } from "./application/modules/supplier.module";
import { CardModule } from "./application/modules/card.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		PostgresqlDatabaseModule,
		RedisDatabaseModule,
		UserModule,
		SupplierModule,
		CardModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
