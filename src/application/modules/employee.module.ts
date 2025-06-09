import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, Supplier, EmployeeCredentials } from '../../../domain/entities'; // Adjusted path
import { EmployeeController } from '../../../interface/controllers/employee.controller'; // Adjusted path

// Use Cases (ensure index file exports all of them)
import {
  CreateEmployeeUseCase,
  GetAllEmployeesUseCase,
  GetEmployeeByIdUseCase,
  UpdateEmployeeUseCase,
  DeleteEmployeeUseCase,
  GetEmployeesBySupplierUseCase,
  GetEmployeeByEmailUseCase,
  MarkEmployeeEmailAsVerifiedUseCase,
  UpdateEmployeeProfileImageUseCase,
} from '../use-cases/employee';

// Repositories - Interface & Implementation
import { IEmployeeRepository, ISupplierRepository } from '../../../domain/repositories'; // ISupplierRepository for type safety if bound here
import { EmployeeRepository, SupplierRepository } from '../../../infrastructure/repositories'; // SupplierRepository if bound here

// Other necessary modules
import { TokenModule } from './token.module'; // Retained
import { FileStorageModule } from './file-storage.module'; // Retained for controller
// Assuming SupplierModule exists and provides ISupplierRepository
import { SupplierModule } from './supplier.module';
// Assuming EmailModule exists and provides EmailService, if not, EmailService needs to be provided here.
// For now, let's assume EmailService is provided globally or by another imported module if needed by Employee use cases.
// The current Employee use cases don't directly inject EmailService, but MarkEmployeeEmailAsVerifiedUseCase might imply it.
// Re-checking: MarkEmployeeEmailAsVerifiedUseCase does NOT use EmailService. It's EmailVerificationService that does.

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeCredentials, Supplier]),
    TokenModule,
    FileStorageModule,
    SupplierModule, // To provide ISupplierRepository for GetEmployeesBySupplierUseCase
  ],
  controllers: [EmployeeController],
  providers: [
    // EmployeeService is removed

    // All Employee Use Cases
    CreateEmployeeUseCase, // Was already partially there
    GetAllEmployeesUseCase,
    GetEmployeeByIdUseCase,
    UpdateEmployeeUseCase,
    DeleteEmployeeUseCase,
    GetEmployeesBySupplierUseCase,
    GetEmployeeByEmailUseCase,
    MarkEmployeeEmailAsVerifiedUseCase,
    UpdateEmployeeProfileImageUseCase,

    // Repository Implementation (needed for the binding below)
    EmployeeRepository,
    // If SupplierModule doesn't export ISupplierRepository with its concrete class,
    // and GetEmployeesBySupplierUseCase needs ISupplierRepository, we might need to provide it here.
    // However, the cleaner way is SupplierModule providing it.
    // For now, assuming SupplierModule handles the ISupplierRepository binding.

    // Repository Interface Binding
    {
      provide: IEmployeeRepository, // Using the actual Symbol/token
      useClass: EmployeeRepository,
    },
    // Note: If IEmployeeRepository was previously bound with string 'IEmployeeRepository',
    // ensure consistency or update all injections to use the Symbol.
    // The original used string 'IEmployeeRepository'. Let's stick to that for minimal diff unless Symbol is preferred project-wide.
    // Reverting to string token for IEmployeeRepository to match original module for now.
    // {
    //   provide: 'IEmployeeRepository', // Sticking to original string token for this example
    //   useClass: EmployeeRepository,
    // }
  ],
  exports: [
    // EmployeeService is removed
    // Export the repository interface token if other modules need to inject it.
    IEmployeeRepository, // Exporting the Symbol token for consistency
  ],
})
export class EmployeeModule {}
