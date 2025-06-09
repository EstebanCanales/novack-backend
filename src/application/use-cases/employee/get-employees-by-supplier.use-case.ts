import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Employee } from '../../../../domain/entities/employee.entity';
import { IEmployeeRepository } from '../../../../domain/repositories/employee.repository.interface';
import { ISupplierRepository } from '../../../../domain/repositories/supplier.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';

@Injectable()
export class GetEmployeesBySupplierUseCase {
  constructor(
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    @Inject(ISupplierRepository)
    private readonly supplierRepository: ISupplierRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('GetEmployeesBySupplierUseCase');
  }

  async execute(supplierId: string): Promise<Employee[]> {
    this.logger.log(`Attempting to fetch employees for supplier id: ${supplierId}`, { supplierId });

    // Verify supplier exists to provide a clear error if the supplier ID is invalid.
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier) {
      this.logger.warn(`Supplier not found when attempting to fetch its employees: ${supplierId}`, { supplierId });
      throw new NotFoundException(`Supplier with ID "${supplierId}" not found.`);
    }

    // The IEmployeeRepository.findBySupplier method should handle loading necessary relations
    // if they are expected as part of this list view (e.g., 'credentials' for some status flags, though unlikely for a list).
    const employees = await this.employeeRepository.findBySupplier(supplierId);

    this.logger.log(`Successfully fetched ${employees.length} employees for supplier id: ${supplierId}`, {
      supplierId,
      count: employees.length
    });
    return employees;
  }
}
