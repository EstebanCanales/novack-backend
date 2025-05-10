import { Module } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier, SupplierSubscription } from "src/domain/entities";
import { EmailService } from "../services/email.service";
import { EmployeeModule } from "./employee.module";
import { FileStorageService } from '../services/file-storage.service';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier, SupplierSubscription]),
		EmployeeModule,
	],
	controllers: [SupplierController],
	providers: [
		SupplierService,
		EmailService,
		FileStorageService,
		ImageProcessingPipe,
	],
	exports: [SupplierService]
})
export class SupplierModule {}
