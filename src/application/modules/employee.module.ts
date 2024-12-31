import { Module } from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { EmployeeController } from '../../interface/controllers/employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, Supplier } from 'src/domain/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Supplier])],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService]
})
export class EmployeeModule {} 