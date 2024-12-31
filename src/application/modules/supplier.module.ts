import { Module } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier, Employee } from "src/domain/entities";
import { EmployeeService } from "../services/employee.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier, Employee])
	],
	controllers: [SupplierController],
	providers: [SupplierService, EmployeeService],
	exports: [SupplierService]
})
export class SupplierModule {}
