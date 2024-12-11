import { Module } from "@nestjs/common";
import { SupplierService } from "../services/supplier.service";
import { SupplierController } from "../../interface/controllers/supplier.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Supplier } from "src/domain/entities";

@Module({
	imports: [TypeOrmModule.forFeature([Supplier])],
	controllers: [SupplierController],
	providers: [SupplierService],
	exports: [SupplierService],
})
export class SupplierModule {}
