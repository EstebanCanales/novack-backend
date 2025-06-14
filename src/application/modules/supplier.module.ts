import { Module, forwardRef } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier, SupplierSubscription } from "src/domain/entities";
import { EmailService } from "../services/email.service";
import { EmployeeModule } from "./employee.module";
import { FileStorageModule } from './file-storage.module';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';
import { StripeModule } from "./stripe/stripe.module"; // Import StripeModule
import { TokenModule } from "./token.module";
import { ISupplierRepository } from "../../domain/repositories/supplier.repository.interface";
import { SupplierRepository } from "../../infrastructure/repositories/supplier.repository";

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier, SupplierSubscription]),
		forwardRef(() => EmployeeModule),
		forwardRef(() => StripeModule), // Add StripeModule here
		TokenModule,
		FileStorageModule,
	],
	controllers: [SupplierController],
	providers: [
		SupplierService,
		EmailService,
		ImageProcessingPipe,
		SupplierRepository,
		{
			provide: ISupplierRepository,
			useClass: SupplierRepository
		}
	],
	exports: [
		SupplierService,
		ISupplierRepository
	]
})
export class SupplierModule {}
