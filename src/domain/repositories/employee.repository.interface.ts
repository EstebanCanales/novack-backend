/**
 * Interfaz para el repositorio de empleados
 * 
 * Define los métodos que debe implementar cualquier repositorio que maneje
 * la persistencia de entidades de tipo Employee, siguiendo el principio de
 * inversión de dependencias de Clean Architecture.
 */

import { Employee } from '../entities/employee.entity';
import { EmployeeCredentials } from '../entities/employee-credentials.entity';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(employee: Partial<Employee>): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<void>;
  findBySupplier(supplierId: string): Promise<Employee[]>;
  updateCredentials(employeeId: string, credentials: Partial<EmployeeCredentials>): Promise<void>;
  findByVerificationToken(token: string): Promise<Employee | null>;
  findByResetToken(token: string): Promise<Employee | null>;
} 