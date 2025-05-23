import { Module } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier, SupplierSubscription } from "src/domain/entities";
import { EmailService } from "../services/email.service";
import { EmployeeModule } from "./employee.module";
import { FileStorageModule } from './file-storage.module';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';
import { TokenModule } from "./token.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier, SupplierSubscription]),
		EmployeeModule,
		TokenModule,
		FileStorageModule,
	],
	controllers: [SupplierController],
	providers: [
		SupplierService,
		EmailService,
		ImageProcessingPipe,
	],
	exports: [SupplierService]
})
export class SupplierModule {}
