import { Inject, Injectable } from '@nestjs/common';
import { Employee } from '../../../../domain/entities/employee.entity';
import { IEmployeeRepository } from '../../../../domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';

@Injectable()
export class GetAllEmployeesUseCase {
  constructor(
    @Inject(IEmployeeRepository) // Use the DI token Symbol
    private readonly employeeRepository: IEmployeeRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('GetAllEmployeesUseCase');
  }

  async execute(): Promise<Employee[]> {
    this.logger.log('Attempting to fetch all employees.');

    // The repository method findAll should ideally handle which relations are loaded.
    // For a GetAllEmployees use case, it's common to load essential relations
    // or provide pagination/filtering options in a more advanced scenario.
    // For now, a simple findAll is implemented.
    const employees = await this.employeeRepository.findAll();

    this.logger.log(`Successfully fetched ${employees.length} employees.`, { count: employees.length });
    return employees;
  }
}
