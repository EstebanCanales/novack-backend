import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
	const logger = new Logger("Bootstrap");
	try {
		const app = await NestFactory.create(AppModule);
		const port = process.env.PORT || 4000;

		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
			}),
		);

		app.enableCors();

		await app.listen(port);
		logger.log(`🚀 Application is running on: http://localhost:${port}`);
	} catch (error) {
		logger.error("❌ Error starting application:", error.message);
		process.exit(1);
	}
}

bootstrap();
