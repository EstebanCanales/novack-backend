import { Module } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier } from "src/domain/entities";
import { EmployeeModule } from "./employee.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier]),
		EmployeeModule
	],
	controllers: [SupplierController],
	providers: [SupplierService],
	exports: [SupplierService],
})
export class SupplierModule {}
