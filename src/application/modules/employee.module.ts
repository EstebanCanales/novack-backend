import { Module } from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { EmployeeController } from '../../interface/controllers/employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, Supplier, EmployeeAuth } from 'src/domain/entities';
import { FileStorageService } from '../services/file-storage.service';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Supplier, EmployeeAuth]),
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    FileStorageService,
    ImageProcessingPipe,
  ],
  exports: [EmployeeService]
})
export class EmployeeModule {} 
