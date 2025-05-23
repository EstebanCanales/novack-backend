import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CreateEmployeeDto } from '../dtos/employee';
import { UpdateEmployeeDto } from '../dtos/employee';
import { Employee } from 'src/domain/entities';
import { EmployeeCredentials } from 'src/domain/entities/employee-credentials.entity';
import * as bcrypt from 'bcrypt';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';

@Injectable()
export class EmployeeService {
  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const { password, ...employeeData } = createEmployeeDto;
    
    // Verificar si ya existe un empleado con el mismo email
    const existingEmployee = await this.employeeRepository.findByEmail(employeeData.email);
    if (existingEmployee) {
      throw new BadRequestException('Ya existe un empleado con ese email');
    }
    
    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear el empleado con sus credenciales
    const newEmployee = await this.employeeRepository.create({
      ...employeeData,
      credentials: {
        password_hash: hashedPassword,
        is_email_verified: false,
        two_factor_enabled: false
      } as any // Usar 'any' para evitar el error de tipo
    });
    
    return newEmployee;
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.findAll();
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }
    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const { password, ...employeeData } = updateEmployeeDto;
    
    // Verificar si el empleado existe
    const existingEmployee = await this.findOne(id);
    
    // Si hay una nueva contraseña, actualizarla
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.employeeRepository.updateCredentials(id, {
        password_hash: hashedPassword
      });
    }
    
    // Actualizar los datos del empleado
    return this.employeeRepository.update(id, employeeData);
  }

  async remove(id: string): Promise<void> {
    // Verificar si el empleado existe
    const existingEmployee = await this.findOne(id);
    
    // Eliminar el empleado
    await this.employeeRepository.delete(id);
  }

  async findBySupplier(supplierId: string): Promise<Employee[]> {
    return this.employeeRepository.findBySupplier(supplierId);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmail(email);
  }

  async verifyEmail(id: string): Promise<Employee> {
    // Verificar si el empleado existe
    const employee = await this.findOne(id);
    
    // Actualizar el estado de verificación
    await this.employeeRepository.updateCredentials(id, {
      is_email_verified: true,
      verification_token: null
    });
    
    return this.employeeRepository.findById(id);
  }

  async updateProfileImageUrl(id: string, imageUrl: string): Promise<Employee> {
    // Verificar si el empleado existe
    const employee = await this.findOne(id);
    
    // Actualizar la URL de la imagen de perfil
    return this.employeeRepository.update(id, {
      profile_image_url: imageUrl
    });
  }
}
