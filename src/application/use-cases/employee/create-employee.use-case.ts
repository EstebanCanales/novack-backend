/**
 * Caso de uso: Crear empleado
 * 
 * Implementa la lógica de aplicación para crear un nuevo empleado.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IEmployeeRepository } from '../../../domain/repositories/employee.repository.interface';
import { Employee } from '../../../domain/entities';
import { CreateEmployeeDto } from '../../dtos/employee/create-employee.dto';

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  /**
   * Ejecuta el caso de uso para crear un empleado
   */
  async execute(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Aquí iría la lógica de validación específica
    // Por ejemplo, verificar que no exista un empleado con el mismo correo
    
    const existingEmployee = await this.employeeRepository.findByEmail(createEmployeeDto.email);
    if (existingEmployee) {
      throw new Error('Ya existe un empleado con este correo electrónico');
    }
    
    // Crear y retornar el nuevo empleado
    return this.employeeRepository.create(createEmployeeDto);
  }
} 