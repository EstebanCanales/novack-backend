import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, Supplier } from 'src/domain/entities';
import { EmployeeCredentials } from 'src/domain/entities/employee-credentials.entity';
import { EmployeeController } from 'src/interface/controllers/employee.controller';
import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from 'src/infrastructure/repositories/employee.repository';
import { CreateEmployeeUseCase } from '../use-cases/employee/create-employee.use-case';
import { TokenModule } from './token.module';
import { FileStorageModule } from './file-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Supplier, EmployeeCredentials]),
    TokenModule,
    FileStorageModule,
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeRepository,
    CreateEmployeeUseCase,
    {
      provide: 'IEmployeeRepository',
      useClass: EmployeeRepository
    }
  ],
  exports: [EmployeeService, EmployeeRepository]
})
export class EmployeeModule {} 
